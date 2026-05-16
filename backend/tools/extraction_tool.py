"""
FlowAgent — Extraction Tool (SENSE Layer)

Uses Gemini 2.5 Flash via the unified google-genai SDK to extract
structured financial data from multimodal inputs (photo/voice/text).

Reference: domain_specs.md §1, implementation_plan.md §4.3
"""

import json
import logging
from pathlib import Path

from google.genai import types as genai_types

from config import get_genai_client, get_settings
from models import TransactionPayload

logger = logging.getLogger("flowagent.tools.extraction")

# Load the sense prompt template
_PROMPT_PATH = Path(__file__).parent.parent / "agents" / "prompts" / "sense_prompt.txt"


def _load_sense_prompt() -> str:
    """Load the extraction prompt from file, with fallback."""
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text(encoding="utf-8")
    logger.warning("sense_prompt.txt not found, using default prompt.")
    return (
        "Ekstrak data transaksi keuangan dari input berikut. "
        "Output harus berupa JSON dengan field: type, amount, entity, due_date, confidence_score. "
        "type harus salah satu dari: cash_in, cash_out, receivable_created, payable_created. "
        "amount dalam Rupiah (angka saja). "
        "due_date dalam format ISO 8601 atau null. "
        "confidence_score antara 0.0 dan 1.0."
    )


async def extract_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> TransactionPayload:
    """
    Extract transaction data from a receipt/invoice image.

    Args:
        image_bytes: Raw bytes of the image file.
        mime_type: MIME type of the image (default: image/jpeg).

    Returns:
        Validated TransactionPayload from Gemini's extraction.

    Raises:
        ValueError: If Gemini output cannot be parsed into a valid TransactionPayload.
    """
    client = get_genai_client()
    settings = get_settings()
    prompt = _load_sense_prompt()

    response = client.models.generate_content(
        model=settings.GEMINI_SENSE_MODEL,
        contents=[
            genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=genai_types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    logger.info("Gemini extraction completed for image (%d bytes)", len(image_bytes))
    return _parse_response(response.text)


async def extract_from_text(text_input: str) -> TransactionPayload:
    """
    Extract transaction data from a text description.

    Args:
        text_input: Natural language description of a transaction.

    Returns:
        Validated TransactionPayload.
    """
    client = get_genai_client()
    settings = get_settings()
    prompt = _load_sense_prompt()

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=f"{prompt}\n\nInput teks:\n{text_input}",
        config=genai_types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    logger.info("Gemini extraction completed for text input")
    return _parse_response(response.text)


def _parse_response(raw_json: str) -> TransactionPayload:
    """Parse and validate Gemini's JSON output into a TransactionPayload."""
    try:
        data = json.loads(raw_json)
        payload = TransactionPayload(**data)
        logger.info(
            "Parsed payload: type=%s, amount=%.0f, entity=%s, confidence=%.2f",
            payload.type, payload.amount, payload.entity, payload.confidence_score,
        )
        return payload
    except (json.JSONDecodeError, Exception) as exc:
        logger.error("Failed to parse Gemini response: %s", raw_json[:200])
        raise ValueError(f"Invalid extraction output from Gemini: {exc}") from exc
