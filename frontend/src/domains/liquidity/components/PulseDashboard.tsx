/**
 * PulseDashboard — Premium Redesigned Dashboard
 *
 * v0.6.0: Added AI Insight Banner, Trends, Progress Bars, and Area Chart.
 */

import type { BusinessState } from "../../../core/types/schema";
import { HealthScoreRing } from "./HealthScoreRing";
import { CashFlowCard } from "./CashFlowCard";
import { useNavigate } from "react-router-dom";
import { 
  LineChart, Line, AreaChart, Area, ResponsiveContainer 
} from "recharts";
import "./PulseDashboard.css";

interface PulseDashboardProps {
  state: BusinessState;
}

// Dummy data for the mini omzet chart
const omzetChartData = [
  { value: 10 }, { value: 20 }, { value: 15 }, { value: 40 },
  { value: 30 }, { value: 50 }, { value: 65 },
];

// Dummy data for the bottom liquidity trend chart
const liquidityHistory = [
  { day: "Sen", value: 28000000 },
  { day: "Sel", value: 29500000 },
  { day: "Rab", value: 27000000 },
  { day: "Kam", value: 31000000 },
  { day: "Jum", value: 30000000 },
  { day: "Sab", value: 32000000 },
  { day: "Min", value: 30400000 },
];

export function PulseDashboard({ state }: PulseDashboardProps) {
  const { liquid_assets, trapped_capital, liabilities, ai_metrics } = state;
  const navigate = useNavigate();
  const totalCash = liquid_assets.cash_on_hand + liquid_assets.bank_balance;
  const totalTrapped = trapped_capital.receivables_total + trapped_capital.dead_stock_value;

  return (
    <section className="pulse-dashboard fade-slide-up">
      {/* ── Header: Health Score ── */}
      <div className="pulse-dashboard__header">
        <HealthScoreRing
          score={ai_metrics.health_score}
        />
      </div>

      {/* ── AI Insight Banner ✨ ── */}
      <div className="ai-insight-banner fade-slide-up">
        <div className="ai-insight-banner__icon">✨</div>
        <div className="ai-insight-banner__content">
          <p className="ai-insight-banner__text">
            Kas aman, namun performa bulan ini menurun. AI mendeteksi penumpukan piutang tertahan.
          </p>
          <button 
            className="ai-insight-banner__cta"
            onClick={() => navigate("/agent")}
          >
            Lihat Rekomendasi
          </button>
        </div>
      </div>

      {/* ── Main 2x2 Grid ── */}
      <div className="pulse-dashboard__grid">
        <CashFlowCard
          label="KAS LIKUID"
          value={totalCash}
          color="positive"
          icon="💵"
          trendValue={12}
          trendDirection="up"
        />
        <CashFlowCard
          label="MODAL KERJA TERTAHAN"
          value={totalTrapped}
          color="warning"
          progressBar={{
            labelA: "Piutang",
            percentA: 70,
            labelB: "Stok",
            percentB: 30
          }}
        />
        <CashFlowCard
          label="OMZET BERJALAN"
          value={ai_metrics.gross_revenue}
          color="info"
          icon="📈"
          trendValue={8}
          trendDirection="down"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={omzetChartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00D8FF"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CashFlowCard>
        <CashFlowCard
          label="LABA BERSIH"
          value={ai_metrics.net_margin}
          color="critical"
          icon="⚠️"
          isNegative={ai_metrics.net_margin < 0}
          trendValue={15}
          trendDirection="down"
        />
      </div>

      {/* ── Bottom Section: Area Chart ── */}
      <div className="pulse-dashboard__history-section fade-slide-up">
        <h3 className="section-title">TREN LIKUIDITAS (7 HARI)</h3>
        <div className="history-chart-wrapper">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={liquidityHistory}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D8FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00D8FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#00D8FF" 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Warning Banner ── */}
      {liabilities.payables_total > 0 && ai_metrics.cash_runway_days < 30 && (
        <div 
          className="pulse-dashboard__warning-banner fade-slide-up"
          onClick={() => navigate("/agent")}
          style={{ cursor: "pointer" }}
        >
          <span className="pulse-dashboard__warning-icon">⚠️</span>
          <div className="pulse-dashboard__warning-text">
            <span className="pulse-dashboard__warning-title">Waspada Defisit Kas</span>
            <span className="pulse-dashboard__warning-desc">
              Kewajiban vendor {ai_metrics.cash_runway_days} hari lagi. Klik mitigasi AI.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
