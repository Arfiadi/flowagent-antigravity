import asyncio
import sys
import os
import json
from datetime import datetime, timezone

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import BusinessState, TransactionPayload, LiquidAssets, TrappedCapital, Liabilities, AiMetrics
from tools.firestore_tool import _update_and_recalculate, read_business_state, write_action, read_recent_transactions, read_recent_actions
from tools.action_tool import generate_action_draft
from config import get_firestore_client

def setup_test_state(uid: str):
    """Set up a fresh test state in Firestore."""
    db = get_firestore_client()
    now = datetime.now(timezone.utc).isoformat()
    
    state = BusinessState(
        liquid_assets=LiquidAssets(cash_on_hand=5000000, bank_balance=10000000, uncategorized_inflows=0, last_updated=now),
        trapped_capital=TrappedCapital(receivables=[], receivables_total=0, aging_receivables_metrics={"below_15d": 0.0, "15d_to_30d": 0.0, "above_30d": 0.0}, inventory_estimate=20000000, dead_stock_value=0),
        liabilities=Liabilities(payables=[], payables_total=0, upcoming_opex=3000000),
        ai_metrics=AiMetrics(cash_runway_days=0, liquidity_risk_level="low", health_score=0, gross_revenue=50000000, net_margin=0, days_sales_outstanding_dso=0)
    )
    
    db.collection("business_state").document(uid).set(state.model_dump())
    
    # Clear actions for this uid
    docs = db.collection("agent_actions").where("uid", "==", uid).stream()
    for doc in docs:
        doc.reference.delete()
        
    print(f"\n[SETUP] Clean state created for {uid}")
    return state

def run_state_tests():
    uid = "test-comprehensive-user"
    
    print("\n==================================================")
    print("  PHASE 2: STATE LAYER (Logic Backend) TESTING")
    print("==================================================")

    # ---------------------------------------------------------
    # Test Case 2.1: Siklus Kasbon - Lunas
    # ---------------------------------------------------------
    setup_test_state(uid)
    now = datetime.now(timezone.utc).isoformat()
    
    # Action 1: Create Receivable (Kasbon)
    payload_create = TransactionPayload(
        type="receivable_created", amount=500000, entity_name="Toko A", due_date="2026-06-01", confidence_score=0.95
    )
    _update_and_recalculate(uid, payload_create, now)
    state1 = read_business_state(uid)
    assert state1.trapped_capital.receivables_total == 500000, f"Expected 500k, got {state1.trapped_capital.receivables_total}"
    assert len(state1.trapped_capital.receivables) == 1
    print("✔️ [PASS] Test 2.1a: Receivable created successfully.")

    # Action 2: Pay Receivable (Lunas)
    payload_paid = TransactionPayload(
        type="receivable_paid", amount=500000, entity_name="Toko A", due_date=None, confidence_score=0.95
    )
    _update_and_recalculate(uid, payload_paid, now)
    state2 = read_business_state(uid)
    assert state2.trapped_capital.receivables_total == 0, f"Expected 0, got {state2.trapped_capital.receivables_total}"
    assert len(state2.trapped_capital.receivables) == 0, f"Expected empty array, got len {len(state2.trapped_capital.receivables)}"
    # Initial cash was 5M + 10M = 15M. After payment, should increase by 500k
    expected_cash = 5000000 + 500000
    assert state2.liquid_assets.cash_on_hand == expected_cash, f"Cash mismatch. Got {state2.liquid_assets.cash_on_hand}"
    print("✔️ [PASS] Test 2.1b: Receivable paid and cleared successfully.")

    # ---------------------------------------------------------
    # Test Case 2.2: Pembayaran Sebagian/Cicilan
    # ---------------------------------------------------------
    setup_test_state(uid)
    
    # Action 1: Create Payable
    payload_payable = TransactionPayload(
        type="payable_created", amount=1000000, entity_name="Agen Beras", due_date="2026-06-01", confidence_score=0.95
    )
    _update_and_recalculate(uid, payload_payable, now)
    
    # Action 2: Pay partially
    payload_partial = TransactionPayload(
        type="payable_paid", amount=400000, entity_name="Agen Beras", due_date=None, confidence_score=0.95
    )
    _update_and_recalculate(uid, payload_partial, now)
    
    state3 = read_business_state(uid)
    assert state3.liabilities.payables_total == 600000, f"Expected 600k remaining payable, got {state3.liabilities.payables_total}"
    assert state3.liabilities.payables[0].amount == 600000, "Granular object amount not updated correctly."
    print("✔️ [PASS] Test 2.2: Partial payable cleared successfully.")

    # ---------------------------------------------------------
    # Test Case 2.4: Edge Case Opex
    # ---------------------------------------------------------
    setup_test_state(uid)
    
    # Pay Opex more than upcoming_opex
    payload_opex = TransactionPayload(
        type="cash_out", amount=4000000, entity_name="PLN", category="Operasional", due_date=None, confidence_score=0.95
    )
    _update_and_recalculate(uid, payload_opex, now)
    state4 = read_business_state(uid)
    
    assert state4.liabilities.upcoming_opex == 0, f"Opex should be 0, not negative. Got {state4.liabilities.upcoming_opex}"
    print("✔️ [PASS] Test 2.4: Opex edge case handled (no negative liabilities).")


async def run_think_tests():
    uid = "test-comprehensive-user"
    print("\n==================================================")
    print("  PHASE 3: THINK LAYER (Autonomous Agent) TESTING")
    print("==================================================")
    
    # We will set a high risk state
    state = setup_test_state(uid)
    state.liabilities.payables_total = 100000000 # Massive debt to trigger risk
    state.liquid_assets.cash_on_hand = 10000
    state.ai_metrics.health_score = 0.5 # High risk
    
    # Test Case 3.1: Anti-Spam
    recent_tx = []
    recent_actions = []
    
    print("Triggering AI Agent (Attempt 1 - No Memory)...")
    action1 = await generate_action_draft(state, recent_tx, recent_actions)
    if action1:
        print(f"✔️ [PASS] AI generated an action due to high risk: [{action1.action_type}] Target: {action1.target_entity}")
        write_action(uid, action1)
        
        print("\nTriggering AI Agent (Attempt 2 - With Memory)...")
        recent_actions_updated = read_recent_actions(uid, limit=5)
        action2 = await generate_action_draft(state, recent_tx, recent_actions_updated)
        
        if action2 and action1.target_entity == action2.target_entity and action1.action_type == action2.action_type:
            print("❌ [FAIL] AI spammed the same action!")
        else:
            print("✔️ [PASS] AI respected Anti-Duplication memory.")
    else:
        print("❌ [FAIL] AI failed to generate action on high risk state.")


if __name__ == "__main__":
    run_state_tests()
    asyncio.run(run_think_tests())
    print("\n✅ All comprehensive tests completed.")
