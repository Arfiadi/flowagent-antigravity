/**
 * FlowAgent — App Shell (MVP Demo)
 *
 * Renders the PulseDashboard with mock data for visual verification.
 * Firebase integration will replace mock data in Phase 3.
 */

import type { BusinessState } from "./core/types/schema";
import { PulseDashboard } from "./domains/liquidity";
import { ReviewCard } from "./domains/ingestion";
import { ActionDraftCard } from "./domains/agent";
import type { TransactionPayload, AgentAction } from "./core/types/schema";
import "./App.css";

/* ─── Mock Data (Will be replaced by Firestore in Phase 3) ──────── */

const MOCK_STATE: BusinessState = {
  liquid_assets: {
    cash_on_hand: 2_500_000,
    bank_balance: 15_000_000,
    last_updated: new Date().toISOString(),
  },
  trapped_capital: {
    receivables_total: 8_500_000,
    inventory_estimate: 45_000_000,
    dead_stock_value: 12_000_000,
  },
  liabilities: {
    payables_total: 9_000_000,
    upcoming_opex: 3_000_000,
  },
  ai_metrics: {
    cash_runway_days: 14,
    liquidity_risk_level: "medium",
    health_score: 1.22,
  },
};

const MOCK_PAYLOAD: TransactionPayload = {
  type: "receivable_created",
  amount: 2_000_000,
  entity: "Pak Budi",
  due_date: "2026-05-22",
  confidence_score: 0.72,
};

const MOCK_ACTION: AgentAction = {
  id: "demo-001",
  action_type: "whatsapp_collection",
  status: "pending_review",
  target_entity: "Toko Makmur",
  message_body:
    "Halo Bosku, nitip info kasbon bulan lalu sebesar Rp 5.000.000 yang jatuh tempo kemarin ya. Terima kasih bos!",
  risk_context:
    "Kasbon Toko Makmur sudah lewat 15 hari. Kas riil tersisa untuk 14 hari.",
  created_at: new Date().toISOString(),
};

/* ─── App Component ──────────────────────────────────────────────── */

function App() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__logo">
          <span className="text-accent">Flow</span>Agent
        </h1>
        <p className="text-caption">Asisten Finansial UMKM</p>
      </header>

      <main className="app-shell__main stagger-children">
        {/* Screen B: Dashboard */}
        <PulseDashboard state={MOCK_STATE} />

        {/* Screen A: Extraction Review */}
        <section className="app-shell__section">
          <h2 className="text-overline" style={{ padding: "0 var(--fa-space-lg)" }}>
            Hasil Ekstraksi AI
          </h2>
          <div style={{ padding: "0 var(--fa-space-lg)" }}>
            <ReviewCard
              payload={MOCK_PAYLOAD}
              onApprove={(p) => console.log("Approved:", p)}
              onEdit={(p) => console.log("Edit:", p)}
            />
          </div>
        </section>

        {/* Screen C: Action Center */}
        <section className="app-shell__section">
          <h2 className="text-overline" style={{ padding: "0 var(--fa-space-lg)" }}>
            Pusat Aksi AI
          </h2>
          <div style={{ padding: "0 var(--fa-space-lg)" }}>
            <ActionDraftCard
              action={MOCK_ACTION}
              onApprove={(a) => console.log("Action approved:", a)}
              onReject={(a) => console.log("Action rejected:", a)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
