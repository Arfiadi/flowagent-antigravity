"""
FlowAgent — Strict Pydantic V2 Data Contracts

These models mirror the Firestore collections exactly.
Any changes MUST be synchronized with:
  - artifacts/data_contracts.md (Source of Truth)
  - frontend/src/core/types/schema.ts (TypeScript)

All currency values are in IDR (Indonesian Rupiah) as floats.
All dates use ISO 8601 format strings.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ─── Literal Union Types ────────────────────────────────────────────

TransactionType = Literal[
    "cash_in",
    "cash_out",
    "receivable_created",
    "receivable_paid",
    "payable_created",
    "payable_paid",
]

ExtractionTransactionType = Literal[
    "cash_in",
    "cash_out",
    "receivable_created",
    "payable_created",
]

SourceModality = Literal["voice", "photo", "text", "manual"]

RiskLevel = Literal["high", "medium", "low"]

ActionType = Literal[
    "whatsapp_collection",
    "supplier_negotiation",
    "stock_warning",
]

ActionStatus = Literal["pending_review", "approved", "rejected"]


# ─── Constants ──────────────────────────────────────────────────────

CONFIDENCE_THRESHOLD: float = 0.85


# ─── Collection: business_state/{uid} ───────────────────────────────


class LiquidAssets(BaseModel):
    cash_on_hand: float = Field(ge=0, description="Cash available in hand (IDR)")
    bank_balance: float = Field(ge=0, description="Bank account balance (IDR)")
    last_updated: str = Field(description="ISO 8601 datetime of last update")


class TrappedCapital(BaseModel):
    receivables_total: float = Field(ge=0, description="Total outstanding receivables (IDR)")
    inventory_estimate: float = Field(ge=0, description="Estimated inventory value (IDR)")
    dead_stock_value: float = Field(ge=0, description="Value of dead/slow-moving stock (IDR)")


class Liabilities(BaseModel):
    payables_total: float = Field(ge=0, description="Total outstanding payables (IDR)")
    upcoming_opex: float = Field(ge=0, description="Upcoming operational expenses (IDR)")


class AiMetrics(BaseModel):
    cash_runway_days: int = Field(ge=0, description="Estimated days of cash remaining")
    liquidity_risk_level: RiskLevel = Field(description="Current risk classification")
    health_score: float = Field(ge=0, description="Liquidity health score ratio")


class BusinessState(BaseModel):
    """Singleton document per user representing real-time liquidity snapshot."""

    liquid_assets: LiquidAssets
    trapped_capital: TrappedCapital
    liabilities: Liabilities
    ai_metrics: AiMetrics


# ─── Collection: transactions/{auto_id} ─────────────────────────────


class Transaction(BaseModel):
    """Event-sourced transaction log entry."""

    id: str = Field(description="Firestore auto-generated document ID")
    type: TransactionType
    amount: float = Field(gt=0, description="Transaction amount in IDR")
    entity_name: str = Field(min_length=1, description="Name of counterparty")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 date or null")
    source_modality: SourceModality
    confidence_score: float = Field(ge=0, le=1, description="AI extraction confidence")
    created_at: str = Field(description="ISO 8601 datetime of creation")


# ─── Collection: agent_actions/{auto_id} ────────────────────────────


class AgentAction(BaseModel):
    """Drafted mitigation action awaiting user approval."""

    id: str = Field(description="Firestore auto-generated document ID")
    action_type: ActionType
    status: ActionStatus = Field(default="pending_review")
    target_entity: str = Field(min_length=1, description="Target entity name")
    message_body: str = Field(min_length=1, description="Draft message content")
    risk_context: str = Field(min_length=1, description="Why the AI proposed this action")
    created_at: str = Field(description="ISO 8601 datetime of creation")


# ─── Payload: TransactionPayload (AI Extraction Output) ─────────────


class TransactionPayload(BaseModel):
    """
    Schema for Gemini Flash extraction output.
    Validated before writing to the transactions collection.
    """

    type: ExtractionTransactionType
    amount: float = Field(gt=0, description="Extracted amount in IDR")
    entity: str = Field(min_length=1, description="Extracted entity name")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 date or null")
    confidence_score: float = Field(ge=0, le=1, description="Model confidence")

    def requires_manual_review(self) -> bool:
        """Returns True if confidence is below the guardrail threshold."""
        return self.confidence_score < CONFIDENCE_THRESHOLD
