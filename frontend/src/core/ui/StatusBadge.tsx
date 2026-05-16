/**
 * StatusBadge — Semantic risk level indicator
 *
 * Displays risk levels (High/Medium/Low) with corresponding colors
 * from domain_specs.md §2.B.
 */

import type { RiskLevel } from "../types/schema";
import "./StatusBadge.css";

interface StatusBadgeProps {
  /** Risk level determines color */
  level: RiskLevel;
  /** Optional label override (defaults to the level name in Indonesian) */
  label?: string;
}

const DEFAULT_LABELS: Record<RiskLevel, string> = {
  high: "Risiko Tinggi",
  medium: "Waspada",
  low: "Aman",
};

export function StatusBadge({ level, label }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${level}`}>
      <span className="status-badge__dot" />
      {label ?? DEFAULT_LABELS[level]}
    </span>
  );
}
