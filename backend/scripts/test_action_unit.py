"""
Unit tests for the FlowAgent THINK + ACT Layer (action_tool.py).
Verifies autonomous action planning:
- High-risk states trigger action generation.
- Low-risk (SAFE) states return None.
- Schema validation of outputs (Pydantic models).
- Self-correction retry logic upon validation errors.
- Anti-duplication memory verification (passing recent actions context).
"""

import sys
import os
import asyncio
import json
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from pydantic import ValidationError

# Ensure parent directory is in the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import BusinessState, LiquidAssets, TrappedCapital, Liabilities, AiMetrics, AgentAction
from tools.action_tool import generate_action_draft

# Configure stdout/stderr encoding to prevent Windows cp1252 encoding issues
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ─── Mock Classes for Google GenAI SDK ───────────────────────────────

class MockFunctionCall:
    def __init__(self, name, args):
        self.name = name
        self.args = args

class MockResponse:
    def __init__(self, function_calls=None, text=""):
        self.function_calls = function_calls or []
        self.text = text

# ─── Helper to Construct Business State ──────────────────────────────

def make_test_state(health_score: float, risk_level: str, runway: int) -> BusinessState:
    """Helper to generate a BusinessState object with specified risk parameters."""
    now = datetime.now(timezone.utc).isoformat()
    return BusinessState(
        liquid_assets=LiquidAssets(
            cash_on_hand=5000000.0,
            bank_balance=10000000.0,
            uncategorized_inflows=0.0,
            last_updated=now
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
            cash_runway_days=runway,
            liquidity_risk_level=risk_level,
            health_score=health_score,
            gross_revenue=50000000.0,
            net_margin=0.0,
            days_sales_outstanding_dso=0.0
        )
    )

# ─── Test Cases ──────────────────────────────────────────────────────

async def test_high_risk_triggers_action():
    """Verify that a high-risk business state triggers mitigation action generation."""
    print("Testing high-risk state action generation...")
    state = make_test_state(health_score=0.4, risk_level="high", runway=5)
    
    # Mock LLM response: returns a valid function call to create_action_draft
    mock_args = {
        "action_type": "whatsapp_collection",
        "target_entity": "Toko Makmur",
        "message_body": "Selamat siang Boss Toko Makmur... mohon bantuannya untuk segera diselesaikan transfernya.",
        "risk_context": "Health score rendah (0.4) dan runway tinggal 5 hari."
    }
    mock_call = MockFunctionCall(name="create_action_draft", args=mock_args)
    mock_response = MockResponse(function_calls=[mock_call])
    
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    
    mock_settings = MagicMock()
    mock_settings.GEMINI_THINK_MODEL = "mock-gemini-pro"

    with patch("tools.action_tool.get_genai_client", return_value=mock_client), \
         patch("tools.action_tool.get_settings", return_value=mock_settings):
         
        action = await generate_action_draft(state, recent_transactions=[], recent_actions=[])
        
        # Assertions
        assert action is not None, "Should generate an action draft for high-risk state"
        assert isinstance(action, AgentAction)
        assert action.action_type == "whatsapp_collection"
        assert action.target_entity == "Toko Makmur"
        assert action.message_body == mock_args["message_body"]
        assert action.risk_context == mock_args["risk_context"]
        assert action.status == "pending_review"
        assert action.id is not None
        assert action.created_at is not None
        
        # Verify the client was called with correct model
        mock_client.models.generate_content.assert_called_once()
        call_kwargs = mock_client.models.generate_content.call_args[1]
        assert call_kwargs["model"] == "mock-gemini-pro"
        
        # Verify state content was serialized into the prompt
        prompt = call_kwargs["contents"]
        assert '"liquidity_risk_level": "high"' in prompt
        assert '"health_score": 0.4' in prompt

    print("✔️ [PASS] test_high_risk_triggers_action")


async def test_low_risk_returns_none():
    """Verify that a low-risk (SAFE) state returns None (no action taken)."""
    print("Testing low-risk (SAFE) state returns None...")
    state = make_test_state(health_score=5.0, risk_level="low", runway=180)
    
    # Mock LLM response: returns no function calls (empty list)
    mock_response = MockResponse(function_calls=[])
    
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    
    mock_settings = MagicMock()
    mock_settings.GEMINI_THINK_MODEL = "mock-gemini-pro"

    with patch("tools.action_tool.get_genai_client", return_value=mock_client), \
         patch("tools.action_tool.get_settings", return_value=mock_settings):
         
        action = await generate_action_draft(state, recent_transactions=[], recent_actions=[])
        
        # Assertions
        assert action is None, "Should NOT generate action for a healthy state"
        mock_client.models.generate_content.assert_called_once()

    print("✔️ [PASS] test_low_risk_returns_none")


async def test_anti_duplication_memory():
    """Verify that recent actions memory (anti-duplication) context is serialized and sent to the agent."""
    print("Testing anti-duplication memory context serialization...")
    state = make_test_state(health_score=0.4, risk_level="high", runway=5)
    
    recent_actions = [
        {
            "id": "act-123",
            "action_type": "whatsapp_collection",
            "target_entity": "Toko Makmur",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending_review"
        }
    ]
    
    mock_response = MockResponse(function_calls=[])
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    mock_settings = MagicMock()
    mock_settings.GEMINI_THINK_MODEL = "mock-gemini-pro"

    with patch("tools.action_tool.get_genai_client", return_value=mock_client), \
         patch("tools.action_tool.get_settings", return_value=mock_settings):
         
        await generate_action_draft(state, recent_transactions=[], recent_actions=recent_actions)
        
        # Verify the prompt contains serialized history memory
        call_kwargs = mock_client.models.generate_content.call_args[1]
        prompt = call_kwargs["contents"]
        
        assert "act-123" in prompt
        assert "Toko Makmur" in prompt
        assert "whatsapp_collection" in prompt
        assert "═══ HISTORI AKSI AI (Memory) ═══" in prompt

    print("✔️ [PASS] test_anti_duplication_memory")


async def test_schema_validation_and_self_correction_success():
    """Verify self-correction loop when schema validation fails on 1st attempt but succeeds on 2nd attempt."""
    print("Testing schema validation failure and self-correction success...")
    state = make_test_state(health_score=0.4, risk_level="high", runway=5)
    
    # First attempt: Invalid argument (action_type "invalid_type" violates pydantic ActionType literal validation)
    bad_call = MockFunctionCall(
        name="create_action_draft",
        args={
            "action_type": "invalid_type",
            "target_entity": "Toko Makmur",
            "message_body": "Body",
            "risk_context": "Risk context"
        }
    )
    
    # Second attempt: Valid arguments
    good_call = MockFunctionCall(
        name="create_action_draft",
        args={
            "action_type": "whatsapp_collection",
            "target_entity": "Toko Makmur",
            "message_body": "Valid body message",
            "risk_context": "Valid risk context"
        }
    )
    
    # Mock client generate_content returns bad_call first, then good_call
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [
        MockResponse(function_calls=[bad_call]),
        MockResponse(function_calls=[good_call])
    ]
    
    mock_settings = MagicMock()
    mock_settings.GEMINI_THINK_MODEL = "mock-gemini-pro"

    with patch("tools.action_tool.get_genai_client", return_value=mock_client), \
         patch("tools.action_tool.get_settings", return_value=mock_settings):
         
        action = await generate_action_draft(state, recent_transactions=[], recent_actions=[])
        
        # Assertions
        assert action is not None
        assert action.action_type == "whatsapp_collection"
        assert action.message_body == "Valid body message"
        
        # Verify client was called twice
        assert mock_client.models.generate_content.call_count == 2
        
        # Verify self-correction error feedback was appended to prompt in second call
        second_call_kwargs = mock_client.models.generate_content.call_args_list[1][1]
        second_prompt = second_call_kwargs["contents"]
        assert "⚠️ PERBAIKAN DARI KESALAHAN SEBELUMNYA:" in second_prompt
        assert "Gagal memvalidasi output:" in second_prompt

    print("✔️ [PASS] test_schema_validation_and_self_correction_success")


async def test_schema_validation_failure_raises_value_error():
    """Verify that if all attempts fail validation, a ValueError is raised."""
    print("Testing schema validation persistent failure raises ValueError...")
    state = make_test_state(health_score=0.4, risk_level="high", runway=5)
    
    # Both attempts return invalid arguments
    bad_call = MockFunctionCall(
        name="create_action_draft",
        args={
            "action_type": "invalid_type",
            "target_entity": "",  # Empty target_entity fails validation (min_length=1)
            "message_body": "Body",
            "risk_context": "Risk context"
        }
    )
    
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = MockResponse(function_calls=[bad_call])
    mock_settings = MagicMock()
    mock_settings.GEMINI_THINK_MODEL = "mock-gemini-pro"

    with patch("tools.action_tool.get_genai_client", return_value=mock_client), \
         patch("tools.action_tool.get_settings", return_value=mock_settings):
         
        # Should raise ValueError after max retries
        try:
            await generate_action_draft(state, recent_transactions=[], recent_actions=[])
            assert False, "Should have raised ValueError due to persistent validation failure"
        except ValueError as e:
            assert "Agentic reasoning failed" in str(e)
            
        assert mock_client.models.generate_content.call_count == 2

    print("✔️ [PASS] test_schema_validation_failure_raises_value_error")


# ─── Main Runner ─────────────────────────────────────────────────────

async def main_async():
    print("==================================================")
    print("  RUNNING THINK + ACT LAYER UNIT TESTS")
    print("==================================================")
    
    await test_high_risk_triggers_action()
    await test_low_risk_returns_none()
    await test_anti_duplication_memory()
    await test_schema_validation_and_self_correction_success()
    await test_schema_validation_failure_raises_value_error()
    
    print("\n==================================================")
    print("🎉 All unit tests completed successfully! [PASS] ")
    print("==================================================")

def main():
    try:
        asyncio.run(main_async())
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

if __name__ == "__main__":
    main()
