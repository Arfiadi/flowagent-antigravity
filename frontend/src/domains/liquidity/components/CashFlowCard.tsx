/**
 * CashFlowCard — Individual metric card with animated value
 *
 * Source of truth: ui_ux_design.md §3.A
 * Displays a single financial metric inside a GlassCard.
 */

import { GlassCard } from "../../../core/ui";
import "./CashFlowCard.css";

interface CashFlowCardProps {
  /** Label describing the metric (e.g., "Kas Tunai") */
  label: string;
  /** Monetary value in IDR */
  value: number;
  /** Semantic color of the value */
  color?: "positive" | "warning" | "critical" | "default";
}

/**
 * Formats a number into Indonesian Rupiah string.
 * e.g. 2500000 → "Rp 2.500.000"
 */
function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CashFlowCard({
  label,
  value,
  color = "default",
}: CashFlowCardProps) {
  return (
    <GlassCard className="cashflow-card fade-slide-up">
      <span className="cashflow-card__label text-overline">{label}</span>
      <span className={`cashflow-card__value cashflow-card__value--${color}`}>
        {formatRupiah(value)}
      </span>
    </GlassCard>
  );
}

export { formatRupiah };
