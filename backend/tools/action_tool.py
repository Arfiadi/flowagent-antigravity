"""
FlowAgent — Action Tool (ACT Layer)

Uses Gemini 2.5 Pro via the unified google-genai SDK to generate
contextual, non-duplicate action drafts based on:
- Current business state (real-time snapshot)
- Recent transaction history (temporal context)
- Previous AI actions (anti-duplication memory)

Supports three action types:
- whatsapp_collection: Penagihan piutang ke pelanggan
- supplier_negotiation: Negosiasi tempo hutang ke vendor
- stock_warning: Peringatan cuci gudang dead stock

Reference: domain_specs.md §3, PRD §3.3
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
        "Analisis state keuangan berikut dan hasilkan draf aksi mitigasi risiko "
        "yang sopan namun tegas dalam Bahasa Indonesia. "
        "Output JSON dengan field: action_type, target_entity, message_body, risk_context."
    )


async def generate_action_draft(
    state: BusinessState,
    recent_transactions: list[dict] | None = None,
    recent_actions: list[dict] | None = None,
    target_entity: str = "",
) -> AgentAction:
    """
    Generate an action draft based on the current business state
    AND historical context to prevent duplicate recommendations.

    The Gemini Pro model receives three layers of context:
    1. Current state snapshot (what's happening now)
    2. Recent transactions (what happened recently)
    3. Previous AI actions (what we already recommended)

    Args:
        state: Current validated business state from Firestore.
        recent_transactions: Last N transactions for temporal context.
        recent_actions: Last N AI actions for anti-duplication.
        target_entity: Optional specific entity to target.

    Returns:
        Validated AgentAction ready to be written to Firestore.
    """
    client = get_genai_client()
    settings = get_settings()
    prompt = _load_think_prompt()

    # Serialize all context layers
    state_context = json.dumps(state.model_dump(), indent=2, default=str)
    tx_context = json.dumps(recent_transactions or [], indent=2, default=str)
    action_history = json.dumps(recent_actions or [], indent=2, default=str)

    full_prompt = (
        f"{prompt}\n\n"
        f"═══ STATE KEUANGAN SAAT INI ═══\n{state_context}\n\n"
        f"═══ HISTORI 20 TRANSAKSI TERAKHIR ═══\n{tx_context}\n\n"
        f"═══ HISTORI AKSI AI TERAKHIR (jangan duplikasi!) ═══\n{action_history}\n\n"
        f"Target entity (jika ada): {target_entity or 'Pilih yang paling urgent'}\n\n"
        "Output JSON satu objek aksi."
    )

    response = client.models.generate_content(
        model=settings.GEMINI_THINK_MODEL,
        contents=full_prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    logger.info("Gemini Pro action generation completed")
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
