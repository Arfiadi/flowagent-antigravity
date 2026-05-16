/**
 * HealthScoreRing — Circular glowing liquidity health indicator
 *
 * Source of truth: ui_ux_design.md §3.A, domain_specs.md §2.B
 * Colors: Red (<1.0), Amber (1.0-1.5), Green (>1.5)
 */

import type { RiskLevel } from "../../core/types/schema";
import "./HealthScoreRing.css";

interface HealthScoreRingProps {
  /** Health score value (ratio) */
  score: number;
  /** Risk level determines ring color */
  riskLevel: RiskLevel;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 54; // radius = 54

/**
 * Maps score to a fill percentage (capped at 100%).
 * Score of 1.5+ = 100% fill.
 */
function scoreToPercent(score: number): number {
  return Math.min((score / 1.5) * 100, 100);
}

export function HealthScoreRing({ score, riskLevel }: HealthScoreRingProps) {
  const percent = scoreToPercent(score);
  const strokeOffset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;

  return (
    <div className={`health-ring health-ring--${riskLevel}`}>
      <svg className="health-ring__svg" viewBox="0 0 120 120">
        {/* Background track */}
        <circle
          className="health-ring__track"
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="6"
        />
        {/* Foreground progress */}
        <circle
          className="health-ring__progress"
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={strokeOffset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="health-ring__label">
        <span className="health-ring__value">{score.toFixed(2)}</span>
        <span className="health-ring__caption">Health Score</span>
      </div>
    </div>
  );
}
