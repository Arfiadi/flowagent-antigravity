"""
FlowAgent — Strict Pydantic V2 Data Contracts

These models mirror the Firestore collections exactly.
Any changes MUST be synchronized with:
  - artifacts/database_schema.md (Source of Truth)
  - frontend/src/core/types/schema.ts (TypeScript)

All currency values are in IDR (Indonesian Rupiah) as floats.
All dates use ISO 8601 format strings.

Changelog v0.5.0:
  - Added ReceivableItem, PayableItem (granular per-entity objects)
  - Added uncategorized_inflows to LiquidAssets
  - Added aging_receivables_metrics to TrappedCapital
  - Added gross_revenue, net_margin, days_sales_outstanding_dso to AiMetrics
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


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
    "receivable_paid",
    "payable_created",
    "payable_paid",
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


# ─── Granular Entity Objects (PRD §4) ───────────────────────────────


class ReceivableItem(BaseModel):
    """Satu entri piutang (kasbon pelanggan).

    Menyimpan detail per-entitas agar AI dapat mengetahui
    siapa yang berhutang, berapa, dan kapan jatuh tempo.
    """

    entity_name: str = Field(min_length=1, description="Nama pelanggan")
    amount: float = Field(gt=0, description="Nominal piutang (IDR)")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 jatuh tempo")
    created_at: str = Field(description="ISO 8601 tanggal pencatatan")


class PayableItem(BaseModel):
    """Satu entri hutang (kewajiban ke supplier).

    Menyimpan detail per-vendor agar AI dapat memprioritaskan
    negosiasi berdasarkan urgensi dan nominal.
    """

    entity_name: str = Field(min_length=1, description="Nama supplier")
    amount: float = Field(gt=0, description="Nominal hutang (IDR)")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 jatuh tempo")
    created_at: str = Field(description="ISO 8601 tanggal pencatatan")


# ─── Collection: business_state/{uid} ───────────────────────────────


class LiquidAssets(BaseModel):
    """Kas siap pakai — uang yang benar-benar bisa dibelanjakan hari ini."""

    cash_on_hand: float = Field(ge=0, description="Saldo fisik di kasir (IDR)")
    bank_balance: float = Field(ge=0, description="Saldo rekening bank/e-wallet (IDR)")
    uncategorized_inflows: float = Field(
        default=0, ge=0, description="Dana masuk yang belum di-tagging (IDR)"
    )
    last_updated: str = Field(description="ISO 8601 datetime of last update")


class TrappedCapital(BaseModel):
    """Modal tertahan — uang yang 'ada' tapi tidak bisa dipakai sekarang."""

    receivables: list[ReceivableItem] = Field(
        default_factory=list, description="Daftar piutang aktif per-entitas"
    )
    receivables_total: float = Field(
        ge=0, description="Total outstanding receivables (IDR)"
    )
    aging_receivables_metrics: dict = Field(
        default_factory=lambda: {"below_15d": 0.0, "15d_to_30d": 0.0, "above_30d": 0.0},
        description="Kalkulasi umur piutang dalam 3 bucket (IDR)",
    )
    inventory_estimate: float = Field(
        ge=0, description="Total estimasi nilai modal pada stok (IDR)"
    )
    dead_stock_value: float = Field(
        ge=0, description="Nilai stok dengan perputaran lambat (IDR)"
    )


class Liabilities(BaseModel):
    """Kewajiban — hutang yang harus dibayar."""

    payables: list[PayableItem] = Field(
        default_factory=list, description="Daftar hutang aktif per-vendor"
    )
    payables_total: float = Field(ge=0, description="Total outstanding payables (IDR)")
    upcoming_opex: float = Field(
        ge=0, description="Beban operasional tetap terdekat: sewa, gaji (IDR)"
    )


class AiMetrics(BaseModel):
    """Performance Metrics — derivatif yang dihitung oleh engine recalculation."""

    cash_runway_days: int = Field(ge=0, description="Estimasi ketahanan kas dalam hari")
    liquidity_risk_level: RiskLevel = Field(description="Current risk classification")
    health_score: float = Field(ge=0, description="Liquidity health score ratio")
    gross_revenue: float = Field(
        default=0, ge=0, description="Total omzet berjalan (IDR)"
    )
    net_margin: float = Field(
        default=0, description="Laba bersih di atas kertas (IDR, bisa negatif)"
    )
    days_sales_outstanding_dso: float = Field(
        default=0, ge=0, description="Rata-rata waktu tagih piutang (hari)"
    )


class BusinessState(BaseModel):
    """Singleton document per user representing real-time liquidity snapshot.

    This is the 'Mind' of the AI — the complete financial picture that
    drives all reasoning and action generation decisions.
    """

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
    entity_name: str = Field(default="Umum", description="Name of counterparty")
    category: str = Field(default="Lainnya", description="Kategori transaksi")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 date or null")
    source_modality: SourceModality
    confidence_score: float = Field(ge=0, le=1, description="AI extraction confidence")
    created_at: str = Field(description="ISO 8601 datetime of creation")

    @field_validator("entity_name", mode="before")
    @classmethod
    def clean_entity_name(cls, v: str) -> str:
        if not v or not str(v).strip():
            return "Umum"
        return str(v).strip()


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
    entity_name: str = Field(default="Umum", description="Extracted entity name")
    category: str = Field(default="Lainnya", description="Kategori transaksi (e.g., Stok, Operasional, Gaji)")
    due_date: Optional[str] = Field(default=None, description="ISO 8601 date or null")
    confidence_score: float = Field(ge=0, le=1, description="Model confidence")

    @field_validator("entity_name", mode="before")
    @classmethod
    def clean_entity_name(cls, v: str) -> str:
        if not v or not str(v).strip():
            return "Umum"
        return str(v).strip()

    def requires_manual_review(self) -> bool:
        """Returns True if confidence is below the guardrail threshold."""
        return self.confidence_score < CONFIDENCE_THRESHOLD
