"""
FlowAgent — Action Tool (ACT Layer)

Refactored to use Gemini Native Function Calling and Self-Correction.
Now supports autonomous decision making (Agent can choose NOT to act).
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from typing import Optional

from google.genai import types as genai_types
from pydantic import ValidationError

from config import get_genai_client, get_settings
from models import AgentAction, BusinessState

logger = logging.getLogger("flowagent.tools.action")

_PROMPT_PATH = Path(__file__).parent.parent / "agents" / "prompts" / "think_prompt.txt"

def _load_think_prompt() -> str:
    """Load the reasoning prompt from file."""
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text(encoding="utf-8")
    return "Analisis state keuangan dan hasilkan aksi mitigasi jika diperlukan."

# ─── Agentic Tools (Native Function Calling) ────────────────────────

def create_action_draft(
    action_type: str,
    target_entity: str,
    message_body: str,
    risk_context: str
) -> dict:
    """
    Membuat draf aksi mitigasi risiko keuangan untuk UMKM.
    Panggil fungsi ini HANYA jika terdeteksi risiko yang memerlukan tindakan segera.
    
    Args:
        action_type: Tipe aksi ("whatsapp_collection", "supplier_negotiation", "stock_warning").
        target_entity: Nama pihak/entitas yang ditargetkan (misal: "Toko Abadi").
        message_body: Isi pesan WhatsApp lengkap dalam Bahasa Indonesia yang sopan namun tegas.
        risk_context: Alasan singkat mengapa aksi ini direkomendasikan berdasarkan data.
    """
    return {
        "action_type": action_type,
        "target_entity": target_entity,
        "message_body": message_body,
        "risk_context": risk_context
    }

async def generate_action_draft(
    state: BusinessState,
    recent_transactions: list[dict] | None = None,
    recent_actions: list[dict] | None = None,
    target_entity: str = "",
) -> Optional[AgentAction]:
    """
    Autonomous Agent Reasoning Loop using Native Function Calling.
    Implements Self-Correction and Inner Monologue logging.
    """
    client = get_genai_client()
    settings = get_settings()
    base_prompt = _load_think_prompt()

    # Context Serialization
    state_context = json.dumps(state.model_dump(), indent=2, default=str)
    tx_context = json.dumps(recent_transactions or [], indent=2, default=str)
    action_history = json.dumps(recent_actions or [], indent=2, default=str)

    full_prompt = (
        f"{base_prompt}\n\n"
        f"═══ STATE KEUANGAN SAAT INI ═══\n{state_context}\n\n"
        f"═══ HISTORI TRANSAKSI ═══\n{tx_context}\n\n"
        f"═══ HISTORI AKSI AI (Memory) ═══\n{action_history}\n\n"
        f"Target Spesifik (jika ada): {target_entity or 'Otomatis'}\n\n"
        "TUGAS: Lakukan penalaran (Inner Monologue) terlebih dahulu. "
        "Jika risiko tinggi, panggil fungsi 'create_action_draft'. "
        "Jika kondisi aman, jangan panggil fungsi apapun."
    )

    # Self-Correction Loop (Max 2 attempts)
    max_retries = 2
    current_attempt = 0
    error_feedback = ""

    while current_attempt < max_retries:
        try:
            logger.info("Agent reasoning attempt %d/%d...", current_attempt + 1, max_retries)
            
            final_prompt = full_prompt
            if error_feedback:
                final_prompt += f"\n\n⚠️ PERBAIKAN DARI KESALAHAN SEBELUMNYA:\n{error_feedback}"

            response = client.models.generate_content(
                model=settings.GEMINI_THINK_MODEL,
                contents=final_prompt,
                config=genai_types.GenerateContentConfig(
                    tools=[create_action_draft],
                    temperature=0.2,
                ),
            )

            # Check for tool calls
            tool_calls = response.tool_calls
            if not tool_calls:
                logger.info("Agent decided NO ACTION is needed for the current state.")
                return None

            # Process the first tool call
            call = tool_calls[0]
            args = call.args
            
            # Inner Monologue Log (Model thought usually precedes the call if requested in prompt)
            # In Native Function Calling, we usually get the call directly.
            logger.info("Agent Inner Monologue: Generating action for %s", args.get("target_entity"))

            # Pydantic Validation (Self-Correction Trigger)
            now = datetime.now(timezone.utc).isoformat()
            action = AgentAction(
                id=str(uuid4()),
                action_type=args["action_type"],
                status="pending_review",
                target_entity=args["target_entity"],
                message_body=args["message_body"],
                risk_context=args["risk_context"],
                created_at=now,
            )
            
            logger.info("Action draft generated successfully via Native Tool Use.")
            return action

        except (ValidationError, KeyError, Exception) as exc:
            current_attempt += 1
            error_feedback = f"Gagal memvalidasi output: {str(exc)}. Pastikan semua parameter fungsi terisi dengan benar."
            logger.warning("Self-correction triggered due to error: %s", str(exc))
            
            if current_attempt >= max_retries:
                logger.error("Failed to generate valid action after %d attempts.", max_retries)
                raise ValueError(f"Agentic reasoning failed: {exc}")

    return None
