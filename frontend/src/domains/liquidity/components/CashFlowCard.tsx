/**
 * CashFlowCard — Individual metric card with animated value, trends, and progress bars.
 *
 * Source of truth: ui_ux_design.md §3.A, implementation_plan.md
 */

import { useEffect, useState, ReactNode } from "react";
import { GlassCard } from "../../../core/ui";
import "./CashFlowCard.css";

interface CashFlowCardProps {
  /** Label describing the metric */
  label: string;
  /** Monetary value in IDR */
  value: number;
  /** Semantic color of the value and border */
  color?: "positive" | "warning" | "critical" | "info" | "default";
  /** Optional emoji or string icon */
  icon?: string;
  /** Optional subtitle below value */
  subtitle?: string;
  /** Optional children (charts) */
  children?: ReactNode;
  /** Whether to show a minus sign */
  isNegative?: boolean;
  
  /* --- NEW Redesign Props --- */
  /** Percentage trend (e.g., 12) */
  trendValue?: number;
  /** Direction of the trend */
  trendDirection?: "up" | "down";
  /** Mini progress bar breakdown */
  progressBar?: {
    labelA: string;
    percentA: number;
    labelB: string;
    percentB: number;
  };
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

export function CashFlowCard({
  label,
  value,
  color = "default",
  icon,
  subtitle,
  children,
  isNegative = false,
  trendValue,
  trendDirection,
  progressBar,
}: CashFlowCardProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 500;
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

  const displayString = `${isNegative || displayValue < 0 ? "- " : ""}${formatRupiah(displayValue)}`;

  return (
    <GlassCard className={`cashflow-card cashflow-card--${color} fade-slide-up`}>
      <div className="cashflow-card__header">
        <span className="cashflow-card__label">{label}</span>
        {icon && <span className="cashflow-card__icon">{icon}</span>}
      </div>
      
      <div className="cashflow-card__main">
        <span className={`cashflow-card__value cashflow-card__value--${color}`}>
          {displayString}
        </span>
        
        {/* Trend Indicator */}
        {trendValue !== undefined && (
          <div className={`cashflow-card__trend trend-${trendDirection}`}>
            {trendDirection === "up" ? "▲" : "▼"} {trendValue}% <span className="trend-label">vs bulan lalu</span>
          </div>
        )}
      </div>
      
      {subtitle && <span className="cashflow-card__subtitle">{subtitle}</span>}
      
      {/* Mini Progress Bar Breakdown */}
      {progressBar && (
        <div className="cashflow-card__progress-wrapper">
          <div className="progress-bar-mini">
            <div className="progress-bar-mini__fill progress-bar-mini__fill--a" style={{ width: `${progressBar.percentA}%` }} />
            <div className="progress-bar-mini__fill progress-bar-mini__fill--b" style={{ width: `${progressBar.percentB}%` }} />
          </div>
          <div className="progress-bar-mini__legend">
            <span className="legend-item">
              <i className="dot dot--a" /> {progressBar.labelA} ({progressBar.percentA}%)
            </span>
            <span className="legend-item">
              <i className="dot dot--b" /> {progressBar.labelB} ({progressBar.percentB}%)
            </span>
          </div>
        </div>
      )}
      
      {children && <div className="cashflow-card__chart">{children}</div>}
    </GlassCard>
  );
}

export { formatRupiah };
