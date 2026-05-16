/**
 * PulseDashboard — Main liquidity dashboard layout
 *
 * Source of truth: ui_ux_design.md §3.A
 * Composes HealthScoreRing + CashFlowCards into the home screen.
 */

import type { BusinessState } from "../../../core/types/schema";
import { StatusBadge } from "../../../core/ui";
import { HealthScoreRing } from "./HealthScoreRing";
import { CashFlowCard } from "./CashFlowCard";
import "./PulseDashboard.css";

interface PulseDashboardProps {
  /** Current business state from Firestore */
  state: BusinessState;
}

export function PulseDashboard({ state }: PulseDashboardProps) {
  const { liquid_assets, trapped_capital, liabilities, ai_metrics } = state;
  const totalCash = liquid_assets.cash_on_hand + liquid_assets.bank_balance;

  return (
    <section className="pulse-dashboard fade-slide-up">
      {/* ── Header: Health Score ─────────────────────────────────── */}
      <div className="pulse-dashboard__header">
        <HealthScoreRing
          score={ai_metrics.health_score}
          riskLevel={ai_metrics.liquidity_risk_level}
        />
        <div className="pulse-dashboard__header-info">
          <StatusBadge level={ai_metrics.liquidity_risk_level} />
          <p className="text-caption">
            Proyeksi kas tersisa {ai_metrics.cash_runway_days} hari
          </p>
        </div>
      </div>

      {/* ── Cards Grid ───────────────────────────────────────────── */}
      <div className="pulse-dashboard__grid stagger-children">
        <CashFlowCard
          label="Kas Likuid"
          value={totalCash}
          color="positive"
        />
        <CashFlowCard
          label="Modal Tertahan (Piutang)"
          value={trapped_capital.receivables_total}
          color="warning"
        />
        <CashFlowCard
          label="Hutang Supplier"
          value={liabilities.payables_total}
          color="critical"
        />
      </div>
    </section>
  );
}
