"""
FlowAgent — Action Tool (ACT Layer)

Uses Gemini 2.5 Flash to generate contextual action drafts:
- WhatsApp collection messages for overdue receivables
- Supplier negotiation recommendations

Reference: domain_specs.md §3, implementation_plan.md §4.3
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from google.genai import types as genai_types

from config import get_genai_client, get_settings
from models import AgentAction, BusinessState

logger = logging.getLogger("flowagent.tools.action")

_PROMPT_PATH = Path(__file__).parent.parent / "agents" / "prompts" / "think_prompt.txt"


def _load_think_prompt() -> str:
    """Load the reasoning prompt from file, with fallback."""
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text(encoding="utf-8")
    logger.warning("think_prompt.txt not found, using default prompt.")
    return (
        "Anda adalah FlowAgent, asisten finansial UMKM Indonesia. "
        "Analisis state keuangan berikut dan hasilkan draf aksi penagihan "
        "yang sopan namun tegas dalam Bahasa Indonesia. "
        "Output JSON dengan field: action_type, target_entity, message_body, risk_context."
    )


async def generate_action_draft(
    state: BusinessState,
    target_entity: str = "",
) -> AgentAction:
    """
    Generate an action draft based on the current business state.

    Uses Gemini to reason about liquidity risk and produce
    a contextual WhatsApp collection message.

    Args:
        state: Current validated business state from Firestore.
        target_entity: Optional specific entity to target.

    Returns:
        Validated AgentAction ready to be written to Firestore.
    """
    client = get_genai_client()
    settings = get_settings()
    prompt = _load_think_prompt()

    state_context = json.dumps(state.model_dump(), indent=2, default=str)
    full_prompt = (
        f"{prompt}\n\n"
        f"State keuangan saat ini:\n{state_context}\n\n"
        f"Target entity (jika ada): {target_entity or 'Pilih yang paling urgent'}\n\n"
        "Output JSON satu objek aksi."
    )

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=full_prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    logger.info("Gemini action generation completed")
    return _parse_action(response.text)


def _parse_action(raw_json: str) -> AgentAction:
    """Parse Gemini's JSON output into a validated AgentAction."""
    try:
        data = json.loads(raw_json)
        now = datetime.now(timezone.utc).isoformat()

        action = AgentAction(
            id=data.get("id", str(uuid4())),
            action_type=data.get("action_type", "whatsapp_collection"),
            status="pending_review",
            target_entity=data["target_entity"],
            message_body=data["message_body"],
            risk_context=data["risk_context"],
            created_at=now,
        )
        logger.info(
            "Parsed action: type=%s, target=%s",
            action.action_type, action.target_entity,
        )
        return action
    except (json.JSONDecodeError, KeyError, Exception) as exc:
        logger.error("Failed to parse action response: %s", raw_json[:200])
        raise ValueError(f"Invalid action output from Gemini: {exc}") from exc
