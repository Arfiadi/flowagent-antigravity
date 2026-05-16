"""
FlowAgent — Firestore Tool (STATE Layer)

Handles all Firestore CRUD operations and state recalculation:
- business_state/{uid} (read/update/recalculate)
- transactions/{auto_id} (write/read history)
- agent_actions/{auto_id} (write/read history)

The recalculation engine computes AiMetrics automatically after
every transaction, using formulas from domain_specs.md §2.B:
- health_score = Total Cash / Total Payables Due
- risk_level derived from health_score thresholds
- cash_runway_days = Total Cash / (Daily OpEx estimate)

Reference: database_schema.md, domain_specs.md §2, PRD §4
"""

import logging
from datetime import datetime, timezone

from firebase_admin import firestore
from config import get_firestore_client
from models import (
    BusinessState, TransactionPayload, AgentAction,
    LiquidAssets, TrappedCapital, Liabilities, AiMetrics
)

logger = logging.getLogger("flowagent.tools.firestore")


# ─── READ Operations ────────────────────────────────────────────────


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
    logger.info(
        "Read business_state for uid=%s (health=%.2f, risk=%s)",
        uid,
        state.ai_metrics.health_score,
        state.ai_metrics.liquidity_risk_level,
    )
    return state


def read_recent_transactions(uid: str, limit: int = 20) -> list[dict]:
    """
    Read the N most recent transactions for historical AI context.

    Args:
        uid: The user's ID.
        limit: Maximum number of transactions to return.

    Returns:
        List of transaction dicts, newest first.
    """
    db = get_firestore_client()
    docs = (
        db.collection("transactions")
        .where("uid", "==", uid)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    transactions = [doc.to_dict() for doc in docs]
    logger.info("Read %d recent transactions for uid=%s", len(transactions), uid)
    return transactions


def read_recent_actions(uid: str, limit: int = 10) -> list[dict]:
    """
    Read the N most recent AI actions for anti-duplication context.

    Args:
        uid: The user's ID.
        limit: Maximum number of actions to return.

    Returns:
        List of action dicts, newest first.
    """
    db = get_firestore_client()
    docs = (
        db.collection("agent_actions")
        .where("uid", "==", uid)
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    actions = [doc.to_dict() for doc in docs]
    logger.info("Read %d recent actions for uid=%s", len(actions), uid)
    return actions


# ─── WRITE Operations ───────────────────────────────────────────────


def set_initial_state(uid: str, cash: int, bank: int, inventory: int, receivables: int = 0) -> dict:
    """
    Sets the initial financial position for a new user.
    Strictly follows the 4-map schema via Pydantic Data Contracts.
    """
    db = get_firestore_client()
    state_ref = db.collection("business_state").document(uid)

    @firestore.transactional
    def _do_set(transaction):
        now = datetime.now(timezone.utc).isoformat()
        
        # 1. Instantiate strict Pydantic model (handles defaults & types)
        state_model = BusinessState(
            liquid_assets=LiquidAssets(
                cash_on_hand=cash,
                bank_balance=bank,
                last_updated=now
            ),
            trapped_capital=TrappedCapital(
                receivables=[],
                receivables_total=receivables,
                inventory_estimate=inventory,
                dead_stock_value=0,
                aging_receivables_metrics={
                    "below_15d": receivables, # Initial assumption
                    "15d_to_30d": 0,
                    "above_30d": 0
                }
            ),
            liabilities=Liabilities(
                payables=[],
                payables_total=0,
                upcoming_opex=0
            ),
            ai_metrics=AiMetrics(
                cash_runway_days=0,
                liquidity_risk_level="low",
                health_score=0,
                gross_revenue=0,
                net_margin=0,
                days_sales_outstanding_dso=0
            )
        )
        
        # Convert to raw dict for the recalculation engine
        initial_dict = state_model.model_dump()
        
        # 2. Recalculate metrics based on new balances
        ai_updates = _recalculate_ai_metrics(initial_dict)
        initial_dict["ai_metrics"].update(ai_updates)
        
        # 3. Write back atomically using the validated nested dictionary
        transaction.set(state_ref, initial_dict)
        return initial_dict

    transaction = db.transaction()
    return _do_set(transaction)


def write_transaction(uid: str, payload: TransactionPayload, modality: str = "photo") -> str:
    """
    Write a new transaction to Firestore and trigger state recalculation.

    Flow:
    1. Write raw transaction to 'transactions' collection.
    2. Update business_state arrays (receivables/payables).
    3. Recalculate all AiMetrics (health_score, risk, runway).

    Args:
        uid: The user's ID.
        payload: Validated extraction payload.
        modality: Source modality (photo/voice/text).

    Returns:
        The auto-generated Firestore document ID.
    """
    db = get_firestore_client()
    now = datetime.now(timezone.utc).isoformat()

    # Step 1: Write to transactions collection
    tx_data = {
        "type": payload.type,
        "amount": payload.amount,
        "entity_name": payload.entity_name,
        "category": payload.category,
        "due_date": payload.due_date,
        "source_modality": modality,
        "confidence_score": payload.confidence_score,
        "created_at": now,
        "uid": uid,
    }
    _, doc_ref = db.collection("transactions").add(tx_data)
    logger.info(
        "Transaction written: id=%s, type=%s, amount=%.0f, category=%s",
        doc_ref.id, payload.type, payload.amount, payload.category
    )

    # Step 2 + 3: Update state and recalculate metrics
    _update_and_recalculate(uid, payload, now)

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


# ─── State Update & Recalculation Engine ────────────────────────────


def _update_and_recalculate(uid: str, payload: TransactionPayload, now: str) -> None:
    """
    Read-Compute-Write pattern for business_state using Firestore Transactions.
    """
    db = get_firestore_client()
    state_ref = db.collection("business_state").document(uid)
    transaction = db.transaction()

    @firestore.transactional
    def _atomic_update(transaction, state_ref, payload, now):
        doc = state_ref.get(transaction=transaction)
        if not doc.exists:
            logger.warning("Cannot update: no business_state for uid=%s", uid)
            return None

        state = doc.to_dict()

        # ── Step 2a: Update cash and array fields based on transaction type ──
        match payload.type:
            case "cash_in":
                state["liquid_assets"]["cash_on_hand"] = (
                    state["liquid_assets"].get("cash_on_hand", 0) + payload.amount
                )
                state.setdefault("ai_metrics", {})
                state["ai_metrics"]["gross_revenue"] = (
                    state["ai_metrics"].get("gross_revenue", 0) + payload.amount
                )

            case "cash_out":
                state["liquid_assets"]["cash_on_hand"] = max(
                    0, state["liquid_assets"].get("cash_on_hand", 0) - payload.amount
                )
                if payload.category.lower() == "stok":
                    state["trapped_capital"]["inventory_estimate"] = (
                        state["trapped_capital"].get("inventory_estimate", 0) + payload.amount
                    )
                elif payload.category.lower() in ["operasional", "gaji"]:
                    state["liabilities"]["upcoming_opex"] = max(
                        0, state["liabilities"].get("upcoming_opex", 0) - payload.amount
                    )

            case "receivable_created":
                new_item = {
                    "entity_name": payload.entity_name,
                    "amount": payload.amount,
                    "due_date": payload.due_date,
                    "created_at": now,
                }
                receivables = state.get("trapped_capital", {}).get("receivables", [])
                receivables.append(new_item)
                state["trapped_capital"]["receivables"] = receivables
                state["trapped_capital"]["receivables_total"] = sum(r["amount"] for r in receivables)

            case "receivable_paid":
                state["liquid_assets"]["cash_on_hand"] = (
                    state["liquid_assets"].get("cash_on_hand", 0) + payload.amount
                )
                state.setdefault("ai_metrics", {})
                state["ai_metrics"]["gross_revenue"] = (
                    state["ai_metrics"].get("gross_revenue", 0) + payload.amount
                )
                receivables = state.get("trapped_capital", {}).get("receivables", [])
                remaining_receivables = []
                amount_to_clear = payload.amount
                for r in receivables:
                    if r["entity_name"].lower() == payload.entity_name.lower() and amount_to_clear > 0:
                        if r["amount"] <= amount_to_clear:
                            amount_to_clear -= r["amount"]
                            continue
                        else:
                            r["amount"] -= amount_to_clear
                            amount_to_clear = 0
                            remaining_receivables.append(r)
                    else:
                        remaining_receivables.append(r)
                state["trapped_capital"]["receivables"] = remaining_receivables
                state["trapped_capital"]["receivables_total"] = sum(r["amount"] for r in remaining_receivables)

            case "payable_created":
                new_item = {
                    "entity_name": payload.entity_name,
                    "amount": payload.amount,
                    "due_date": payload.due_date,
                    "created_at": now,
                }
                payables = state.get("liabilities", {}).get("payables", [])
                payables.append(new_item)
                state["liabilities"]["payables"] = payables
                state["liabilities"]["payables_total"] = sum(p["amount"] for p in payables)

            case "payable_paid":
                state["liquid_assets"]["cash_on_hand"] = max(
                    0, state["liquid_assets"].get("cash_on_hand", 0) - payload.amount
                )
                payables = state.get("liabilities", {}).get("payables", [])
                remaining_payables = []
                amount_to_clear = payload.amount
                for p in payables:
                    if p["entity_name"].lower() == payload.entity_name.lower() and amount_to_clear > 0:
                        if p["amount"] <= amount_to_clear:
                            amount_to_clear -= p["amount"]
                            continue
                        else:
                            p["amount"] -= amount_to_clear
                            amount_to_clear = 0
                            remaining_payables.append(p)
                    else:
                        remaining_payables.append(p)
                state["liabilities"]["payables"] = remaining_payables
                state["liabilities"]["payables_total"] = sum(p["amount"] for p in remaining_payables)

        # ── Step 2b: Update timestamp ──
        state["liquid_assets"]["last_updated"] = now

        # ── Step 3: Recalculate ALL AI metrics ──
        ai_updates = _recalculate_ai_metrics(state)
        state.setdefault("ai_metrics", {}).update(ai_updates)

        # Aging receivables
        receivables = state.get("trapped_capital", {}).get("receivables", [])
        state["trapped_capital"]["aging_receivables_metrics"] = _compute_aging_metrics(receivables)

        # ── Write back atomically ──
        transaction.set(state_ref, state)
        return ai_updates

    try:
        ai_updates = _atomic_update(transaction, state_ref, payload, now)
        if ai_updates:
            logger.info(
                "business_state transaction complete for uid=%s: health=%.2f, risk=%s, runway=%d days",
                uid,
                ai_updates["health_score"],
                ai_updates["liquidity_risk_level"],
                ai_updates["cash_runway_days"],
            )
    except Exception as exc:
        logger.error("Transaction failed for uid=%s: %s", uid, exc)
        raise



def _recalculate_ai_metrics(state: dict) -> dict:
    """
    Compute all AI-driven metrics from raw state data.

    Formulas from domain_specs.md §2.B:
    - Health Score = Total Liquid Cash / Total Payables Due
    - Risk: <1.0 = high, 1.0-1.5 = medium, >1.5 = low
    - Runway = Total Cash / Daily OpEx estimate
    """
    la = state.get("liquid_assets", {})
    tc = state.get("trapped_capital", {})
    lb = state.get("liabilities", {})

    total_cash = la.get("cash_on_hand", 0) + la.get("bank_balance", 0)
    total_payables = lb.get("payables_total", 0) + lb.get("upcoming_opex", 0)

    # Health Score (core liquidity indicator)
    if total_payables > 0:
        health_score = round(total_cash / total_payables, 2)
    else:
        health_score = 99.0  # No liabilities = perfectly healthy

    # Risk Level (domain_specs.md §2.B thresholds)
    if health_score < 1.0:
        risk_level = "high"
    elif health_score < 1.5:
        risk_level = "medium"
    else:
        risk_level = "low"

    # Ketahanan Kas (days of survival at current burn rate)
    daily_opex = lb.get("upcoming_opex", 1) / 30
    if daily_opex > 0:
        cash_runway = min(int(total_cash / daily_opex), 365)
    else:
        cash_runway = 365

    # Net Margin = Revenue - (total cash out expenses proxy)
    gross_revenue = state.get("ai_metrics", {}).get("gross_revenue", 0)
    net_margin = gross_revenue - total_payables

    # DSO = (receivables_total / gross_revenue) * 30 days
    receivables_total = tc.get("receivables_total", 0)
    if gross_revenue > 0:
        dso = round((receivables_total / gross_revenue) * 30, 1)
    else:
        dso = 0

    return {
        "health_score": health_score,
        "liquidity_risk_level": risk_level,
        "cash_runway_days": cash_runway,
        "gross_revenue": gross_revenue,
        "net_margin": round(net_margin, 2),
        "days_sales_outstanding_dso": dso,
    }


def _compute_aging_metrics(receivables: list[dict]) -> dict:
    """
    Bucket receivables by age since creation date.

    Three buckets per PRD §4:
    - below_15d: Fresh receivables (low risk)
    - 15d_to_30d: Aging receivables (medium risk)
    - above_30d: Stale receivables (high risk, needs collection)
    """
    now = datetime.now(timezone.utc)
    buckets = {"below_15d": 0.0, "15d_to_30d": 0.0, "above_30d": 0.0}

    for r in receivables:
        created_str = r.get("created_at", "")
        if not created_str:
            continue
        try:
            created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
            age_days = (now - created).days
            if age_days < 15:
                buckets["below_15d"] += r.get("amount", 0)
            elif age_days <= 30:
                buckets["15d_to_30d"] += r.get("amount", 0)
            else:
                buckets["above_30d"] += r.get("amount", 0)
        except (ValueError, TypeError):
            logger.warning("Could not parse created_at: %s", created_str)
            buckets["above_30d"] += r.get("amount", 0)

    return buckets
