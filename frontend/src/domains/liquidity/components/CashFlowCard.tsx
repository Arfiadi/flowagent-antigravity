/**
 * CashFlowCard — Individual metric card with animated value
 *
 * Source of truth: ui_ux_design.md §3.A
 * Displays a single financial metric inside a GlassCard.
 */

import { useEffect, useState } from "react";
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
  const [displayValue, setDisplayValue] = useState(value);

  // Simple counting animation
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 500; // ms
    const incrementTime = 20;
    const steps = duration / incrementTime;
    const increment = (end - start) / steps;

    const timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        clearInterval(timer);
        setDisplayValue(end);
      } else {
        setDisplayValue(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <GlassCard className="cashflow-card fade-slide-up">
      <span className="cashflow-card__label text-overline">{label}</span>
      <span className={`cashflow-card__value cashflow-card__value--${color}`}>
        {formatRupiah(displayValue)}
      </span>
    </GlassCard>
  );
}

export { formatRupiah };
