"""
Test Script for v0.5.0 Engine (Fase 2 & 3)
Tests the recalculation engine and AI context injection.
"""

import asyncio
import sys
import os

# Add parent dir to path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
# Configure logging to show INFO level
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

from models import BusinessState, TransactionPayload, AgentAction, LiquidAssets, TrappedCapital, Liabilities, AiMetrics
from tools.firestore_tool import _update_and_recalculate, read_business_state, write_action, read_recent_transactions, read_recent_actions
from tools.action_tool import generate_action_draft
from config import get_firestore_client
from datetime import datetime, timezone

def setup_test_state(uid: str):
    """Set up a fresh test state in Firestore."""
    db = get_firestore_client()
    now = datetime.now(timezone.utc).isoformat()
    
    state = BusinessState(
        liquid_assets=LiquidAssets(cash_on_hand=5000000, bank_balance=10000000, uncategorized_inflows=0, last_updated=now),
        trapped_capital=TrappedCapital(receivables=[], receivables_total=0, inventory_estimate=20000000, dead_stock_value=0),
        liabilities=Liabilities(payables=[], payables_total=0, upcoming_opex=3000000),
        ai_metrics=AiMetrics(cash_runway_days=0, liquidity_risk_level="low", health_score=0, gross_revenue=50000000, net_margin=0, days_sales_outstanding_dso=0)
    )
    
    # Delete existing test data
    db.collection("business_state").document(uid).set(state.model_dump())
    
    # Clear actions for this uid
    docs = db.collection("agent_actions").where("uid", "==", uid).stream()
    for doc in docs:
        doc.reference.delete()
        
    print(f"[TEST SETUP] Clean state created for {uid}")

async def run_tests():
    uid = "test-user-v050"
    setup_test_state(uid)
    
    # --- FASE 2: Validasi Recalculation Engine & Granularitas ---
    print("\n--- FASE 2: Menguji Recalculation Engine ---")
    payload = TransactionPayload(
        type="receivable_created",
        amount=2500000,
        entity_name="Toko Makmur",
        due_date="2026-05-30",
        confidence_score=0.95
    )
    
    from tools.firestore_tool import write_transaction
    write_transaction(uid, payload, modality="text")
    
    state = read_business_state(uid)
    print(f"Health Score Baru: {state.ai_metrics.health_score} (Diharapkan: 15jt kas / 3jt opex = 5.0)")
    print(f"Cash Runway: {state.ai_metrics.cash_runway_days} hari")
    print(f"Total Piutang: {state.trapped_capital.receivables_total}")
    
    if len(state.trapped_capital.receivables) > 0:
        print(f"[PASSED] Granular Object tersimpan! Entitas: {state.trapped_capital.receivables[0].entity_name}")
    else:
        print("[FAILED] Objek granular piutang tidak tersimpan.")
        
    # --- FASE 3: Menguji AI Context & Anti-Duplikasi ---
    print("\n--- FASE 3: Menguji AI Context & Anti-Duplikasi ---")
    
    print("Memicu AI Draft (Percobaan 1 - Memori Kosong)...")
    
    # Ambil konteks nyata dari Firestore agar AI tahu ada transaksi terbaru
    recent_tx = read_recent_transactions(uid, limit=5)
    recent_actions = read_recent_actions(uid, limit=5)
    
    action1 = await generate_action_draft(state, recent_tx, recent_actions)
    if not action1:
        print("[INFO] AI memutuskan tidak bertindak (cek GEMINI_API_KEY atau Prompt).")
        return

    print(f"[OK] Aksi 1 Terbuat: [{action1.action_type}] Target: {action1.target_entity}")
    print(f"Pesan: {action1.message_body[:50]}...")
    
    # Simpan aksi pertama ke memori (Firestore)
    write_action(uid, action1)
    
    # Panggil ulang AI dengan memori
    print("\nMemicu AI Draft (Percobaan 2 - Membaca Memori Aksi 1)...")
    recent_actions_updated = read_recent_actions(uid, limit=5)
    
    action2 = await generate_action_draft(state, recent_tx, recent_actions_updated)
    print(f"Aksi 2 Terbuat: [{action2.action_type}] Target: {action2.target_entity}")
    print(f"Pesan: {action2.message_body[:50]}...")
    
    if action1.target_entity == action2.target_entity and action1.action_type == action2.action_type:
        print("[FAILED] AI mengalami Amnesia. Mengeluarkan duplikat!")
    else:
        print("[PASSED] AI mematuhi aturan Anti-Duplikasi!")

if __name__ == "__main__":
    asyncio.run(run_tests())
