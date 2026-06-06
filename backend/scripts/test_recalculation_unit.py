"""
Unit tests for the FlowAgent State Layer Recalculation Engine.
Tests the logic of state updates, full/partial payment collections,
opex cap limits, and various AI metric recalculations.
"""

import sys
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

# Ensure parent directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Mock setup for Firebase and config to isolate the tests ──────────

class MockDocumentSnapshot:
    def __init__(self, data, exists=True):
        self._data = data
        self.exists = exists

    def to_dict(self):
        import copy
        return copy.deepcopy(self._data) if self._data is not None else None

class MockDocumentReference:
    def __init__(self, collection_name, doc_id, mock_db):
        self.collection_name = collection_name
        self.id = doc_id
        self.mock_db = mock_db

    def get(self, transaction=None):
        data = self.mock_db.store.get(self.collection_name, {}).get(self.id)
        if data is None:
            return MockDocumentSnapshot(None, exists=False)
        return MockDocumentSnapshot(data, exists=True)

class MockCollectionReference:
    def __init__(self, collection_name, mock_db):
        self.name = collection_name
        self.mock_db = mock_db

    def document(self, doc_id):
        return MockDocumentReference(self.name, doc_id, self.mock_db)

class MockTransaction:
    def __init__(self, mock_db):
        self.mock_db = mock_db

    def set(self, doc_ref, data):
        if doc_ref.collection_name not in self.mock_db.store:
            self.mock_db.store[doc_ref.collection_name] = {}
        import copy
        self.mock_db.store[doc_ref.collection_name][doc_ref.id] = copy.deepcopy(data)

class MockFirestoreClient:
    def __init__(self):
        self.store = {}

    def collection(self, collection_name):
        return MockCollectionReference(collection_name, self)

    def transaction(self):
        return MockTransaction(self)

mock_db_instance = MockFirestoreClient()

# Pass-through decorator for transactions
def mock_transactional(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Inject mocks into sys.modules BEFORE importing tools.firestore_tool
mock_firestore = MagicMock()
mock_firestore.transactional = mock_transactional

sys.modules['firebase_admin'] = MagicMock()
sys.modules['firebase_admin.firestore'] = mock_firestore
sys.modules['firebase_admin'].firestore = mock_firestore

mock_config = MagicMock()
class MockSettings:
    FIREBASE_PROJECT_ID = "mock-project"
    GOOGLE_APPLICATION_CREDENTIALS = "mock-credentials"
    VERTEX_AI_LOCATION = "us-central1"
    GEMINI_SENSE_MODEL = "gemini-2.5-flash"
    GEMINI_THINK_MODEL = "gemini-2.5-pro"
mock_config.get_settings = lambda: MockSettings()
mock_config.get_firestore_client = lambda: mock_db_instance
sys.modules['config'] = mock_config

# Now import the functions to test
from tools.firestore_tool import (
    set_initial_state,
    _update_and_recalculate,
    _recalculate_ai_metrics,
    _compute_aging_metrics
)
from models import TransactionPayload


def test_set_initial_state():
    """Verify that set_initial_state sets the financial snapshot and defaults correctly."""
    uid = "test-user-initial"
    cash = 8000000.0
    bank = 12000000.0
    inventory = 5000000.0
    receivables = 2000000.0

    # Execute
    res = set_initial_state(uid, cash, bank, inventory, receivables)

    # Verify return dict and saved data in database
    saved_state = mock_db_instance.store["business_state"][uid]
    
    assert saved_state["liquid_assets"]["cash_on_hand"] == cash
    assert saved_state["liquid_assets"]["bank_balance"] == bank
    assert saved_state["trapped_capital"]["inventory_estimate"] == inventory
    assert saved_state["trapped_capital"]["receivables_total"] == receivables
    assert saved_state["trapped_capital"]["aging_receivables_metrics"]["below_15d"] == receivables
    
    # Assert initial AI metrics are computed correctly
    # No payables or opex, so health_score should be 99.0, risk level should be "low", and runway should be 365
    assert saved_state["ai_metrics"]["health_score"] == 99.0
    assert saved_state["ai_metrics"]["liquidity_risk_level"] == "low"
    assert saved_state["ai_metrics"]["cash_runway_days"] == 365
    assert saved_state["ai_metrics"]["gross_revenue"] == 0.0
    assert saved_state["ai_metrics"]["days_sales_outstanding_dso"] == 0.0

    print("✔️ [PASS] test_set_initial_state")


def test_update_and_recalculate_receivables():
    """Verify full and partial payments for receivables and matching metrics updates."""
    uid = "test-user-receivables"
    set_initial_state(uid, cash=10000000.0, bank=5000000.0, inventory=2000000.0, receivables=0)

    # 1. Create receivable 1 (Client A, 2,000,000)
    p1 = TransactionPayload(
        type="receivable_created",
        amount=2000000.0,
        entity_name="Client A",
        due_date="2026-06-15",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p1, "2026-06-06T12:00:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["trapped_capital"]["receivables_total"] == 2000000.0
    assert len(state["trapped_capital"]["receivables"]) == 1
    assert state["trapped_capital"]["receivables"][0]["entity_name"] == "Client A"
    assert state["trapped_capital"]["receivables"][0]["amount"] == 2000000.0

    # 2. Create receivable 2 (Client B, 3,000,000)
    p2 = TransactionPayload(
        type="receivable_created",
        amount=3000000.0,
        entity_name="Client B",
        due_date="2026-06-20",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p2, "2026-06-06T12:05:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["trapped_capital"]["receivables_total"] == 5000000.0
    assert len(state["trapped_capital"]["receivables"]) == 2

    # 3. Partial payment of receivable 1 (Client A pays 800,000)
    p3 = TransactionPayload(
        type="receivable_paid",
        amount=800000.0,
        entity_name="Client A",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p3, "2026-06-06T12:10:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["liquid_assets"]["cash_on_hand"] == 10800000.0  # Cash increases
    assert state["trapped_capital"]["receivables_total"] == 4200000.0  # Total decreases
    assert state["ai_metrics"]["gross_revenue"] == 800000.0  # Revenue increases
    
    # Client A receivable should be reduced to 1,200,000
    r_items = state["trapped_capital"]["receivables"]
    client_a_item = next(item for item in r_items if item["entity_name"] == "Client A")
    assert client_a_item["amount"] == 1200000.0

    # 4. Full payment of remaining receivable 1 (Client A pays 1,200,000)
    p4 = TransactionPayload(
        type="receivable_paid",
        amount=1200000.0,
        entity_name="Client A",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p4, "2026-06-06T12:20:00+00:00")

    state = mock_db_instance.store["business_state"][uid]
    assert state["liquid_assets"]["cash_on_hand"] == 12000000.0  # Cash increases
    assert state["trapped_capital"]["receivables_total"] == 3000000.0  # Only Client B's 3,000,000 remains
    assert state["ai_metrics"]["gross_revenue"] == 2000000.0  # Gross revenue accumulated
    
    # Client A's receivable should be completely removed
    r_items = state["trapped_capital"]["receivables"]
    assert not any(item["entity_name"] == "Client A" for item in r_items)
    assert len(r_items) == 1
    assert r_items[0]["entity_name"] == "Client B"

    print("✔️ [PASS] test_update_and_recalculate_receivables")


def test_update_and_recalculate_payables():
    """Verify full and partial payments for payables and matching metrics updates."""
    uid = "test-user-payables"
    set_initial_state(uid, cash=10000000.0, bank=5000000.0, inventory=2000000.0, receivables=0)

    # 1. Create payable 1 (Supplier X, 4,000,000)
    p1 = TransactionPayload(
        type="payable_created",
        amount=4000000.0,
        entity_name="Supplier X",
        due_date="2026-06-18",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p1, "2026-06-06T12:00:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["liabilities"]["payables_total"] == 4000000.0
    assert len(state["liabilities"]["payables"]) == 1
    assert state["liabilities"]["payables"][0]["entity_name"] == "Supplier X"
    assert state["liabilities"]["payables"][0]["amount"] == 4000000.0

    # 2. Create payable 2 (Supplier Y, 2,000,000)
    p2 = TransactionPayload(
        type="payable_created",
        amount=2000000.0,
        entity_name="Supplier Y",
        due_date="2026-06-25",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p2, "2026-06-06T12:05:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["liabilities"]["payables_total"] == 6000000.0
    assert len(state["liabilities"]["payables"]) == 2

    # 3. Partial payment of payable 1 (Pay 1,500,000 to Supplier X)
    p3 = TransactionPayload(
        type="payable_paid",
        amount=1500000.0,
        entity_name="Supplier X",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p3, "2026-06-06T12:10:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["liquid_assets"]["cash_on_hand"] == 8500000.0  # Cash decreases
    assert state["liabilities"]["payables_total"] == 4500000.0  # Total decreases
    
    # Supplier X payable should be reduced to 2,500,000
    p_items = state["liabilities"]["payables"]
    supplier_x_item = next(item for item in p_items if item["entity_name"] == "Supplier X")
    assert supplier_x_item["amount"] == 2500000.0

    # 4. Full payment of remaining payable 1 (Pay 2,500,000 to Supplier X)
    p4 = TransactionPayload(
        type="payable_paid",
        amount=2500000.0,
        entity_name="Supplier X",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p4, "2026-06-06T12:20:00+00:00")

    state = mock_db_instance.store["business_state"][uid]
    assert state["liquid_assets"]["cash_on_hand"] == 6000000.0  # Cash decreases
    assert state["liabilities"]["payables_total"] == 2000000.0  # Only Supplier Y remains
    
    # Supplier X payable should be completely removed
    p_items = state["liabilities"]["payables"]
    assert not any(item["entity_name"] == "Supplier X" for item in p_items)
    assert len(p_items) == 1
    assert p_items[0]["entity_name"] == "Supplier Y"

    print("✔️ [PASS] test_update_and_recalculate_payables")


def test_opex_cash_out_limit():
    """Verify that upcoming_opex decreases with opex cash out but cannot go negative."""
    uid = "test-user-opex"
    set_initial_state(uid, cash=10000000.0, bank=5000000.0, inventory=2000000.0, receivables=0)
    
    # Pre-set upcoming_opex to 3,000,000 to test depletion
    mock_db_instance.store["business_state"][uid]["liabilities"]["upcoming_opex"] = 3000000.0

    # 1. Cash out opex less than limit (gaji 2,000,000)
    p1 = TransactionPayload(
        type="cash_out",
        amount=2000000.0,
        entity_name="Karyawan A",
        category="gaji",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p1, "2026-06-06T12:00:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    assert state["liabilities"]["upcoming_opex"] == 1000000.0
    assert state["liquid_assets"]["cash_on_hand"] == 8000000.0

    # 2. Cash out opex exceeding the remaining limit (operasional 1,500,000)
    p2 = TransactionPayload(
        type="cash_out",
        amount=1500000.0,
        entity_name="Vendor Listrik",
        category="operasional",
        confidence_score=0.95
    )
    _update_and_recalculate(uid, p2, "2026-06-06T12:10:00+00:00")
    
    state = mock_db_instance.store["business_state"][uid]
    # Limit check: upcoming_opex must be capped at 0 and never go negative (e.g. -500,000)
    assert state["liabilities"]["upcoming_opex"] == 0.0
    assert state["liquid_assets"]["cash_on_hand"] == 6500000.0

    print("✔️ [PASS] test_opex_cash_out_limit")


def test_recalculate_ai_metrics_logic():
    """Verify mathematical metrics logic for health score, runway, risk, and DSO."""
    
    # Case A: Healthy State (High Cash, Low Liabilities)
    state_healthy = {
        "liquid_assets": {"cash_on_hand": 5000000.0, "bank_balance": 5000000.0},
        "trapped_capital": {"receivables_total": 2000000.0},
        "liabilities": {"payables_total": 2000000.0, "upcoming_opex": 1000000.0},
        "ai_metrics": {"gross_revenue": 10000000.0}
    }
    
    metrics = _recalculate_ai_metrics(state_healthy)
    
    # health_score = 10,000,000 / 3,000,000 = 3.33
    assert metrics["health_score"] == 3.33
    # risk_level = "low" (health_score >= 1.5)
    assert metrics["liquidity_risk_level"] == "low"
    # daily_opex = 1,000,000 / 30 = 33333.33 -> runway = 10,000,000 / 33333.33 = 300
    assert metrics["cash_runway_days"] == 300
    # net_margin = gross_revenue - total_payables = 10,000,000 - 3,000,000 = 7,000,000
    assert metrics["net_margin"] == 7000000.0
    # DSO = (2,000,000 / 10,000,000) * 30 = 6.0
    assert metrics["days_sales_outstanding_dso"] == 6.0

    # Case B: Medium Risk State
    state_medium = {
        "liquid_assets": {"cash_on_hand": 2000000.0, "bank_balance": 4000000.0},
        "trapped_capital": {"receivables_total": 3000000.0},
        "liabilities": {"payables_total": 3000000.0, "upcoming_opex": 2000000.0},
        "ai_metrics": {"gross_revenue": 15000000.0}
    }
    metrics = _recalculate_ai_metrics(state_medium)
    # health_score = 6,000,000 / 5,000,000 = 1.2
    assert metrics["health_score"] == 1.2
    # risk_level = "medium" (1.0 <= health_score < 1.5)
    assert metrics["liquidity_risk_level"] == "medium"
    # daily_opex = 2,000,000 / 30 = 66666.67 -> runway = 6,000,000 / 66666.67 = 90
    assert metrics["cash_runway_days"] == 90
    # DSO = (3,000,000 / 15,000,000) * 30 = 6.0
    assert metrics["days_sales_outstanding_dso"] == 6.0

    # Case C: High Risk State
    state_high = {
        "liquid_assets": {"cash_on_hand": 1000000.0, "bank_balance": 2000000.0},
        "trapped_capital": {"receivables_total": 4000000.0},
        "liabilities": {"payables_total": 2000000.0, "upcoming_opex": 2000000.0},
        "ai_metrics": {"gross_revenue": 8000000.0}
    }
    metrics = _recalculate_ai_metrics(state_high)
    # health_score = 3,000,000 / 4,000,000 = 0.75
    assert metrics["health_score"] == 0.75
    # risk_level = "high" (health_score < 1.0)
    assert metrics["liquidity_risk_level"] == "high"
    # daily_opex = 2,000,000 / 30 = 66666.67 -> runway = 3,000,000 / 66666.67 = 45
    assert metrics["cash_runway_days"] == 45
    # DSO = (4,000,000 / 8,000,000) * 30 = 15.0
    assert metrics["days_sales_outstanding_dso"] == 15.0

    # Case D: Perfectly Healthy / Zero Liabilities Edge Case
    state_zero_liabilities = {
        "liquid_assets": {"cash_on_hand": 5000000.0, "bank_balance": 5000000.0},
        "trapped_capital": {"receivables_total": 0.0},
        "liabilities": {"payables_total": 0.0, "upcoming_opex": 0.0},
        "ai_metrics": {"gross_revenue": 0.0}
    }
    metrics = _recalculate_ai_metrics(state_zero_liabilities)
    assert metrics["health_score"] == 99.0
    assert metrics["liquidity_risk_level"] == "low"
    assert metrics["cash_runway_days"] == 365
    assert metrics["days_sales_outstanding_dso"] == 0.0

    print("✔️ [PASS] test_recalculate_ai_metrics_logic")


def test_aging_receivables_metrics_calculation():
    """Verify correct bucket categorization for aging receivables metrics."""
    now_utc = datetime.now(timezone.utc)
    
    # Construct dates for aging
    r_fresh = now_utc.isoformat()
    r_10d = (now_utc - timedelta(days=10)).isoformat()
    r_20d = (now_utc - timedelta(days=20)).isoformat()
    r_40d = (now_utc - timedelta(days=40)).isoformat()
    r_invalid = "not-a-valid-date"

    receivables = [
        {"amount": 500000.0, "created_at": r_fresh},       # below 15d
        {"amount": 1000000.0, "created_at": r_10d},       # below 15d
        {"amount": 1500000.0, "created_at": r_20d},       # 15d to 30d
        {"amount": 2000000.0, "created_at": r_40d},       # above 30d
        {"amount": 2500000.0, "created_at": r_invalid},   # above 30d (fallback on parse error)
    ]

    buckets = _compute_aging_metrics(receivables)

    # Verify bucket sums
    assert buckets["below_15d"] == 500000.0 + 1000000.0
    assert buckets["15d_to_30d"] == 1500000.0
    assert buckets["above_30d"] == 2000000.0 + 2500000.0

    print("✔️ [PASS] test_aging_receivables_metrics_calculation")


if __name__ == "__main__":
    print("Running State Layer Recalculation Engine Unit Tests...")
    try:
        test_set_initial_state()
        test_update_and_recalculate_receivables()
        test_update_and_recalculate_payables()
        test_opex_cash_out_limit()
        test_recalculate_ai_metrics_logic()
        test_aging_receivables_metrics_calculation()
        print("\nAll unit tests passed successfully! 🎉")
    except AssertionError as e:
        print(f"\n❌ [FAIL] Assertion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ [FAIL] Unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
