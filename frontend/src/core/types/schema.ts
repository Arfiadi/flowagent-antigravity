/**
 * FlowAgent — Strict TypeScript Data Contracts
 *
 * These interfaces mirror the Firestore collections exactly.
 * Any changes MUST be synchronized with:
 *   - artifacts/database_schema.md (Source of Truth)
 *   - backend/models/state_models.py (Pydantic V2)
 *
 * All currency values are in IDR (Indonesian Rupiah) as floats.
 * All dates use ISO 8601 format strings.
 *
 * Changelog v0.5.0:
 *   - Added ReceivableItem, PayableItem (granular per-entity objects)
 *   - Added uncategorized_inflows to LiquidAssets
 *   - Added aging_receivables_metrics to TrappedCapital
 *   - Added gross_revenue, net_margin, days_sales_outstanding_dso to AiMetrics
 */

// ─── Literal Union Types ────────────────────────────────────────────

export type TransactionType =
  | "cash_in"
  | "cash_out"
  | "receivable_created"
  | "receivable_paid"
  | "payable_created"
  | "payable_paid";

export type SourceModality = "voice" | "photo" | "text" | "manual";

export type RiskLevel = "high" | "medium" | "low";

export type ActionType =
  | "whatsapp_collection"
  | "supplier_negotiation"
  | "stock_warning";

export type ActionStatus = "pending_review" | "approved" | "rejected";

// ─── Granular Entity Objects (PRD §4) ───────────────────────────────

export interface ReceivableItem {
  entity_name: string;
  amount: number;
  due_date: string | null;
  created_at: string;
}

export interface PayableItem {
  entity_name: string;
  amount: number;
  due_date: string | null;
  created_at: string;
}

// ─── Collection: business_state/{uid} ───────────────────────────────

export interface LiquidAssets {
  cash_on_hand: number;
  bank_balance: number;
  uncategorized_inflows: number;
  last_updated: string; // ISO 8601
}

export interface TrappedCapital {
  receivables: ReceivableItem[];
  receivables_total: number;
  aging_receivables_metrics: {
    below_15d: number;
    "15d_to_30d": number;
    above_30d: number;
  };
  inventory_estimate: number;
  dead_stock_value: number;
}

export interface Liabilities {
  payables: PayableItem[];
  payables_total: number;
  upcoming_opex: number;
}

export interface AiMetrics {
  cash_runway_days: number;
  liquidity_risk_level: RiskLevel;
  health_score: number;
  gross_revenue: number;
  net_margin: number;
  days_sales_outstanding_dso: number;
}

export interface BusinessState {
  liquid_assets: LiquidAssets;
  trapped_capital: TrappedCapital;
  liabilities: Liabilities;
  ai_metrics: AiMetrics;
}

// ─── Collection: transactions/{auto_id} ─────────────────────────────

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  entity_name: string;
  category: string;
  due_date: string | null; // ISO 8601 date or null
  source_modality: SourceModality;
  confidence_score: number; // 0.0 – 1.0
  created_at: string; // ISO 8601
}

// ─── Collection: agent_actions/{auto_id} ────────────────────────────

export interface AgentAction {
  id: string;
  action_type: ActionType;
  status: ActionStatus;
  target_entity: string;
  message_body: string;
  risk_context: string;
  created_at: string; // ISO 8601
}

// ─── Payload: TransactionPayload (AI Extraction Output) ─────────────

export interface TransactionPayload {
  type: Extract<TransactionType, "cash_in" | "cash_out" | "receivable_created" | "payable_created">;
  amount: number;
  entity: string;
  category: string;
  due_date: string | null; // ISO 8601 date or null
  confidence_score: number; // 0.0 – 1.0
}

// ─── Constants ──────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLD = 0.85;
