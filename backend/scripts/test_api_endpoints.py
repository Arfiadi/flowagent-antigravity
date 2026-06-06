"""
Unit and Integration Tests for FlowAgent API Endpoints

Tests the following endpoints registered in backend/main.py:
- GET  /api/health
- POST /api/initial-setup
- POST /api/extract
- POST /api/analyze
- POST /api/reset

Uses FastAPI TestClient and mocks external calls to Firestore and Gemini to prevent actual network/API billing.
"""

import sys
import os
import json
from unittest.mock import MagicMock, patch, AsyncMock

# Configure output encoding to support potential unicode characters safely
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Ensure backend directory is in the PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set mock env variables before importing anything to satisfy validations
os.environ["FIREBASE_PROJECT_ID"] = "test-project-123"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service_account.json"
os.environ["VERTEX_AI_LOCATION"] = "us-central1"

# ─── Mock Startup Dependencies ──────────────────────────────────────
mock_db = MagicMock()
# Mock Firestore collection fetch in startup event
mock_db.collection.return_value.limit.return_value.get.return_value = []

mock_genai = MagicMock()

patcher_db = patch("main.get_firestore_client", return_value=mock_db)
patcher_genai = patch("main.get_genai_client", return_value=mock_genai)

patcher_db.start()
patcher_genai.start()

# Now import app and models
from main import app
from fastapi.testclient import TestClient
from models import (
    TransactionPayload,
    BusinessState,
    LiquidAssets,
    TrappedCapital,
    Liabilities,
    AiMetrics,
    AgentAction,
)

# ─── Test Data Setup ─────────────────────────────────────────────────
mock_payload = TransactionPayload(
    type="cash_in",
    amount=500000.0,
    entity_name="Toko A",
    category="Penjualan",
    due_date=None,
    confidence_score=0.95
)

mock_business_state = BusinessState(
    liquid_assets=LiquidAssets(
        cash_on_hand=5000000.0,
        bank_balance=10000000.0,
        uncategorized_inflows=0.0,
        last_updated="2026-06-06T12:00:00Z"
    ),
    trapped_capital=TrappedCapital(
        receivables=[],
        receivables_total=0.0,
        aging_receivables_metrics={"below_15d": 0.0, "15d_to_30d": 0.0, "above_30d": 0.0},
        inventory_estimate=20000000.0,
        dead_stock_value=0.0
    ),
    liabilities=Liabilities(
        payables=[],
        payables_total=0.0,
        upcoming_opex=3000000.0
    ),
    ai_metrics=AiMetrics(
        cash_runway_days=150,
        liquidity_risk_level="low",
        health_score=5.0,
        gross_revenue=50000000.0,
        net_margin=47000000.0,
        days_sales_outstanding_dso=0.0
    )
)

mock_agent_action = AgentAction(
    id="act-456",
    action_type="whatsapp_collection",
    status="pending_review",
    target_entity="Toko A",
    message_body="Halo Toko A, mohon pembayaran piutang...",
    risk_context="Piutang Toko A sebesar 500ribu hampir jatuh tempo.",
    created_at="2026-06-06T12:00:00Z"
)

# ─── Test Definitions ───────────────────────────────────────────────

def test_health():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy"
        assert "version" in data
        assert "project" in data
        print("[PASS] GET /api/health")


@patch("main.set_initial_state")
def test_initial_setup(mock_set_initial_state):
    # Prepare expected return value from set_initial_state
    mock_set_initial_state.return_value = mock_business_state.model_dump()
    
    with TestClient(app) as client:
        response = client.post(
            "/api/initial-setup",
            data={
                "uid": "test-user-123",
                "cash": 5000000,
                "bank": 10000000,
                "inventory": 20000000,
                "receivables": 0,
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["liquid_assets"]["cash_on_hand"] == 5000000.0
        assert data["trapped_capital"]["inventory_estimate"] == 20000000.0
        assert data["ai_metrics"]["liquidity_risk_level"] == "low"
        
        mock_set_initial_state.assert_called_once_with(
            "test-user-123", 5000000, 10000000, 20000000, 0
        )
        print("[PASS] POST /api/initial-setup")


@patch("main.update_business_profile")
def test_profile_setup(mock_update_business_profile):
    mock_update_business_profile.return_value = {
        "profile": {
            "business_name": "Toko Baru",
            "business_type": "Retail",
            "location": "Jakarta",
            "employee_count": 5,
            "primary_focus": "Untung Besar",
        }
    }
    with TestClient(app) as client:
        response = client.post(
            "/api/profile-setup",
            data={
                "uid": "test-user-123",
                "business_name": "Toko Baru",
                "business_type": "Retail",
                "location": "Jakarta",
                "employee_count": 5,
                "primary_focus": "Untung Besar",
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["profile"]["business_name"] == "Toko Baru"
        assert data["profile"]["employee_count"] == 5
        mock_update_business_profile.assert_called_once_with(
            "test-user-123", "Toko Baru", "Retail", "Jakarta", 5, "Untung Besar"
        )
        print("[PASS] POST /api/profile-setup")


@patch("main.extract_from_text", new_callable=AsyncMock)
def test_extract_text(mock_extract_text):
    mock_extract_text.return_value = mock_payload
    
    with TestClient(app) as client:
        response = client.post(
            "/api/extract",
            data={
                "uid": "test-user-123",
                "modality": "text",
                "text": "Toko A bayar tunai 500ribu untuk penjualan barang"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["type"] == "cash_in"
        assert data["amount"] == 500000.0
        assert data["entity_name"] == "Toko A"
        mock_extract_text.assert_called_once_with("Toko A bayar tunai 500ribu untuk penjualan barang")
        print("[PASS] POST /api/extract (text modality)")


@patch("main.extract_from_image", new_callable=AsyncMock)
def test_extract_photo(mock_extract_photo):
    mock_extract_photo.return_value = mock_payload
    
    with TestClient(app) as client:
        file_content = b"fake image bytes"
        response = client.post(
            "/api/extract",
            data={
                "uid": "test-user-123",
                "modality": "photo",
            },
            files={"file": ("receipt.jpg", file_content, "image/jpeg")}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["type"] == "cash_in"
        assert data["amount"] == 500000.0
        mock_extract_photo.assert_called_once_with(
            image_bytes=file_content,
            mime_type="image/jpeg"
        )
        print("[PASS] POST /api/extract (photo modality)")


@patch("main.extract_from_audio", new_callable=AsyncMock)
def test_extract_audio(mock_extract_audio):
    mock_extract_audio.return_value = mock_payload
    
    with TestClient(app) as client:
        file_content = b"fake audio bytes"
        response = client.post(
            "/api/extract",
            data={
                "uid": "test-user-123",
                "modality": "voice",
            },
            files={"file": ("voice.mp3", file_content, "audio/mp3")}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["type"] == "cash_in"
        assert data["amount"] == 500000.0
        mock_extract_audio.assert_called_once_with(
            audio_bytes=file_content,
            mime_type="audio/mp3"
        )
        print("[PASS] POST /api/extract (audio modality)")


def test_extract_missing_inputs():
    with TestClient(app) as client:
        response = client.post(
            "/api/extract",
            data={
                "uid": "test-user-123",
                "modality": "text",
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Either 'file' (for photo/voice) or 'text' must be provided." in response.json()["detail"]
        print("[PASS] POST /api/extract (missing inputs error handling - returned 400)")


@patch("main.write_transaction")
@patch("main.read_business_state")
@patch("main.read_recent_transactions")
@patch("main.read_recent_actions")
@patch("main.generate_action_draft", new_callable=AsyncMock)
@patch("main.write_action")
def test_analyze_action_generated(
    mock_write_action,
    mock_generate_action_draft,
    mock_read_recent_actions,
    mock_read_recent_transactions,
    mock_read_business_state,
    mock_write_transaction,
):
    mock_write_transaction.return_value = "tx-123"
    mock_read_business_state.return_value = mock_business_state
    mock_read_recent_transactions.return_value = []
    mock_read_recent_actions.return_value = []
    mock_generate_action_draft.return_value = mock_agent_action
    mock_write_action.return_value = "act-456"
    
    payload_dict = {
        "type": "cash_in",
        "amount": 500000.0,
        "entity_name": "Toko A",
        "category": "Penjualan",
        "due_date": None,
        "confidence_score": 0.95
    }
    
    with TestClient(app) as client:
        response = client.post(
            "/api/analyze",
            data={
                "uid": "test-user-123",
                "payload_json": json.dumps(payload_dict),
                "modality": "photo"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "complete"
        assert data["transaction_id"] == "tx-123"
        assert data["action_generated"] is True
        assert data["action_id"] == "act-456"
        assert data["health_score"] == 5.0
        assert data["risk_level"] == "low"
        
        mock_write_transaction.assert_called_once()
        mock_read_business_state.assert_called_once_with("test-user-123")
        mock_generate_action_draft.assert_called_once()
        mock_write_action.assert_called_once_with("test-user-123", mock_agent_action)
        print("[PASS] POST /api/analyze (action generated)")


@patch("main.write_transaction")
@patch("main.read_business_state")
@patch("main.read_recent_transactions")
@patch("main.read_recent_actions")
@patch("main.generate_action_draft", new_callable=AsyncMock)
@patch("main.write_action")
def test_analyze_no_action_generated(
    mock_write_action,
    mock_generate_action_draft,
    mock_read_recent_actions,
    mock_read_recent_transactions,
    mock_read_business_state,
    mock_write_transaction,
):
    mock_write_transaction.return_value = "tx-123"
    mock_read_business_state.return_value = mock_business_state
    mock_read_recent_transactions.return_value = []
    mock_read_recent_actions.return_value = []
    mock_generate_action_draft.return_value = None  # Safe state, no action
    
    payload_dict = {
        "type": "cash_in",
        "amount": 500000.0,
        "entity_name": "Toko A",
        "category": "Penjualan",
        "due_date": None,
        "confidence_score": 0.95
    }
    
    with TestClient(app) as client:
        response = client.post(
            "/api/analyze",
            data={
                "uid": "test-user-123",
                "payload_json": json.dumps(payload_dict),
                "modality": "photo"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "complete"
        assert data["transaction_id"] == "tx-123"
        assert data["action_generated"] is False
        assert data["action_id"] is None
        mock_write_action.assert_not_called()
        print("[PASS] POST /api/analyze (no action generated)")


@patch("scripts.reset_db.reset_database")
def test_reset_data(mock_reset_database):
    with TestClient(app) as client:
        response = client.post(
            "/api/reset",
            data={"uid": "test-user-123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "success"
        assert "test-user-123" in data["message"]
        mock_reset_database.assert_called_once_with("test-user-123")
        print("[PASS] POST /api/reset")


# ─── Execution ───────────────────────────────────────────────────────

if __name__ == "__main__":
    print("[START] Starting API Endpoint Tests...")
    try:
        test_health()
        test_initial_setup()
        test_profile_setup()
        test_extract_text()
        test_extract_photo()
        test_extract_audio()
        test_extract_missing_inputs()
        test_analyze_action_generated()
        test_analyze_no_action_generated()
        test_reset_data()
        print("\n[SUCCESS] All tests passed successfully!")
    except AssertionError as e:
        print(f"\n[FAIL] A test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Unexpected error during testing: {e}")
        sys.exit(1)
    finally:
        # Stop startup patchers
        patcher_db.stop()
        patcher_genai.stop()
