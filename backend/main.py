"""
FlowAgent — FastAPI Server Entry Point

Implements the backend Agentic API with three core endpoints:
- POST /api/extract  (SENSE layer)
- POST /api/analyze  (THINK+ACT layer)
- GET  /api/health   (Health check)

Reference: implementation_plan.md §4.4
"""

import logging
import sys

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from models import TransactionPayload, AgentAction
from tools.extraction_tool import extract_from_image, extract_from_text
from tools.firestore_tool import read_business_state, write_transaction, write_action
from tools.action_tool import generate_action_draft

# ─── Logging Configuration ──────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("flowagent")

# ─── FastAPI Application ────────────────────────────────────────────

app = FastAPI(
    title="FlowAgent Agentic API",
    description="Autonomous Financial Assistant for Indonesian SMEs",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Startup Event ──────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Validate configuration and warm up clients on startup."""
    try:
        settings = get_settings()
        logger.info(
            "FlowAgent API starting (project=%s, model=%s)",
            settings.FIREBASE_PROJECT_ID,
            settings.GEMINI_MODEL,
        )
    except Exception as exc:
        logger.error("Startup failed: %s", exc)
        raise


# ─── Endpoints ───────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring."""
    settings = get_settings()
    return {
        "status": "healthy",
        "version": "0.4.0",
        "project": settings.FIREBASE_PROJECT_ID,
        "model": settings.GEMINI_MODEL,
    }


@app.post("/api/extract", response_model=TransactionPayload)
async def extract_transaction(
    uid: str = Form("demo-user"),
    modality: str = Form("photo"),
    file: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    """
    SENSE Layer endpoint.

    Accepts multimodal input (image file or text) and returns
    a structured TransactionPayload extracted by Gemini 2.5 Flash.

    The frontend should display this in a ReviewCard for user approval.
    """
    logger.info("Extract request: uid=%s, modality=%s", uid, modality)

    try:
        if file and modality in ("photo", "image"):
            image_bytes = await file.read()
            payload = await extract_from_image(
                image_bytes=image_bytes,
                mime_type=file.content_type or "image/jpeg",
            )
        elif text:
            payload = await extract_from_text(text)
        else:
            raise HTTPException(
                status_code=400,
                detail="Either 'file' (for photo) or 'text' must be provided.",
            )

        logger.info(
            "Extraction complete: type=%s, amount=%.0f, confidence=%.2f",
            payload.type, payload.amount, payload.confidence_score,
        )
        return payload

    except ValueError as exc:
        logger.error("Extraction validation failed: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Extraction error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="AI extraction failed")


@app.post("/api/analyze")
async def analyze_and_act(
    uid: str = Form("demo-user"),
    payload_json: str = Form(...),
    modality: str = Form("photo"),
):
    """
    THINK + ACT Layer endpoint.

    Triggered after user approves a TransactionPayload:
    1. Writes the transaction to Firestore.
    2. Reads updated business_state.
    3. Generates an action draft if risk is detected.
    4. Writes the action draft to Firestore.

    The frontend ActionCenterFeed will pick up new actions via onSnapshot.
    """
    logger.info("Analyze request: uid=%s", uid)

    try:
        # Step 1: Parse and validate the approved payload
        import json
        data = json.loads(payload_json)
        payload = TransactionPayload(**data)

        # Step 2: Write transaction to Firestore
        tx_id = write_transaction(uid, payload, modality)
        logger.info("Transaction persisted: tx_id=%s", tx_id)

        # Step 3: Read updated business state
        state = read_business_state(uid)
        if not state:
            return {
                "status": "transaction_saved",
                "transaction_id": tx_id,
                "action_generated": False,
                "reason": "No business state found to analyze.",
            }

        # Step 4: Generate action if health score warrants it
        action_id = None
        if state.ai_metrics.health_score < 1.5:
            logger.info("Health score %.2f < 1.5, generating action draft...", state.ai_metrics.health_score)
            action = await generate_action_draft(state)
            action_id = write_action(uid, action)

        return {
            "status": "complete",
            "transaction_id": tx_id,
            "action_generated": action_id is not None,
            "action_id": action_id,
            "health_score": state.ai_metrics.health_score,
        }

    except ValueError as exc:
        logger.error("Validation error: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.error("Analysis error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Analysis pipeline failed")


# ─── Direct Run ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
