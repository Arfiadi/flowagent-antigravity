/**
 * HealthScoreRing — Redesigned as a Gauge Chart (Semi-circle)
 * Provides instant visual indication from Red (0) to Green (5.0).
 */

import "./HealthScoreRing.css";

interface HealthScoreRingProps {
  /** Health score value (ratio, max 5.0) */
  score: number;
}

/**
 * Calculations for the semi-circle gauge.
 * Radius: 80, Center: 100,100.
 * Half-circumference: PI * R = 251.3
 */
const GAUGE_RADIUS = 80;
const GAUGE_CIRCUMFERENCE = Math.PI * GAUGE_RADIUS;

export function HealthScoreRing({ score }: HealthScoreRingProps) {
  // Cap score at 5.0 and map to 0-100%
  const normalizedScore = Math.min(Math.max(score, 0), 5);
  const percentage = (normalizedScore / 5) * 100;
  
  // Calculate offset: 0% = full circumference, 100% = 0 offset
  const offset = GAUGE_CIRCUMFERENCE - (percentage / 100) * GAUGE_CIRCUMFERENCE;

  return (
    <div className="health-gauge">
      <svg className="health-gauge__svg" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF3366" />   {/* Red (Critical) */}
            <stop offset="50%" stopColor="#FFB300" />  {/* Yellow (Warning) */}
            <stop offset="100%" stopColor="#00D8FF" /> {/* Cyan (Healthy) */}
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background Track (Grey semi-circle) */}
        <path
          className="health-gauge__track"
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Progress Fill (Gradient semi-circle) */}
        <path
          className="health-gauge__progress"
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          filter="url(#gaugeGlow)"
        />
      </svg>

      <div className="health-gauge__content">
        <div className="health-gauge__score-wrapper">
          <span className="health-gauge__value">{normalizedScore.toFixed(2)}</span>
          <span className="health-gauge__scale">/ 5.00</span>
        </div>
        <span className="health-gauge__caption">SKOR KESEHATAN</span>
        <span className="health-gauge__insight">▼ Turun 0.5 poin dari minggu lalu</span>
      </div>
    </div>
  );
}
