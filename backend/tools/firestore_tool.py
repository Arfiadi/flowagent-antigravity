"""
FlowAgent — Firestore Tool (STATE Layer)

Handles all Firestore CRUD operations for:
- business_state/{uid} (read/update)
- transactions/{auto_id} (write)
- agent_actions/{auto_id} (write)

Reference: database_schema.md, implementation_plan.md §4.3
"""

import logging
from datetime import datetime, timezone

from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from config import get_firestore_client
from models import BusinessState, TransactionPayload, AgentAction

logger = logging.getLogger("flowagent.tools.firestore")


def read_business_state(uid: str) -> BusinessState | None:
    """
    Read the current business state for a user.

    Args:
        uid: The user's Firestore document ID.

    Returns:
        Validated BusinessState or None if document doesn't exist.
    """
    db = get_firestore_client()
    doc = db.collection("business_state").document(uid).get()

    if not doc.exists:
        logger.warning("No business_state found for uid=%s", uid)
        return None

    state = BusinessState(**doc.to_dict())
    logger.info("Read business_state for uid=%s (health=%.2f)", uid, state.ai_metrics.health_score)
    return state


def write_transaction(uid: str, payload: TransactionPayload, modality: str = "photo") -> str:
    """
    Write a new transaction to Firestore and update business_state accordingly.

    Args:
        uid: The user's ID.
        payload: Validated extraction payload.
        modality: Source modality (photo/voice/text).

    Returns:
        The auto-generated Firestore document ID.
    """
    db = get_firestore_client()
    now = datetime.now(timezone.utc).isoformat()

    # Write to transactions collection
    tx_data = {
        "type": payload.type,
        "amount": payload.amount,
        "entity_name": payload.entity,
        "due_date": payload.due_date,
        "source_modality": modality,
        "confidence_score": payload.confidence_score,
        "created_at": now,
        "uid": uid,
    }
    _, doc_ref = db.collection("transactions").add(tx_data)
    logger.info("Transaction written: id=%s, type=%s, amount=%.0f", doc_ref.id, payload.type, payload.amount)

    # Update business_state based on transaction type
    _update_business_state(uid, payload)

    return doc_ref.id


def write_action(uid: str, action: AgentAction) -> str:
    """
    Write an AI-generated action draft to Firestore.

    Args:
        uid: The user's ID.
        action: Validated action draft from the Think/Act layer.

    Returns:
        The auto-generated Firestore document ID.
    """
    db = get_firestore_client()
    action_data = action.model_dump()
    action_data["uid"] = uid

    _, doc_ref = db.collection("agent_actions").add(action_data)
    logger.info(
        "Action written: id=%s, type=%s, target=%s",
        doc_ref.id, action.action_type, action.target_entity,
    )
    return doc_ref.id


def _update_business_state(uid: str, payload: TransactionPayload) -> None:
    """
    Recalculate and update business_state after a new transaction.
    This is where the THINK layer's real-time recalculation happens.
    """
    db = get_firestore_client()
    state_ref = db.collection("business_state").document(uid)
    now = datetime.now(timezone.utc).isoformat()

    updates: dict = {"liquid_assets.last_updated": now}

    match payload.type:
        case "cash_in":
            updates["liquid_assets.cash_on_hand"] = (
                firestore_increment(payload.amount)
            )
        case "cash_out":
            updates["liquid_assets.cash_on_hand"] = (
                firestore_increment(-payload.amount)
            )
        case "receivable_created":
            updates["trapped_capital.receivables_total"] = (
                firestore_increment(payload.amount)
            )
        case "payable_created":
            updates["liabilities.payables_total"] = (
                firestore_increment(payload.amount)
            )

    state_ref.update(updates)
    logger.info("business_state updated for uid=%s after %s", uid, payload.type)


def firestore_increment(value: float):
    """Helper to create a Firestore increment transform."""
    from google.cloud.firestore_v1 import transforms
    return transforms.Increment(value)
