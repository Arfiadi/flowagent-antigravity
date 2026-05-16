/**
 * FlowAgent — App Shell
 * 
 * Now integrated with real-time Firestore data.
 */

import { useBusinessState } from "./domains/liquidity/hooks/useBusinessState";
import { PulseDashboard } from "./domains/liquidity";
import { ReviewCard } from "./domains/ingestion";
import { ActionDraftCard } from "./domains/agent";
import { ShimmerLoader } from "./core/ui";
import type { TransactionPayload, AgentAction } from "./core/types/schema";
import "./App.css";

/* ─── Mock Data for Demo Sections (Pending Phase 4) ────────────── */

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
  message_body: "Halo Bosku, nitip info kasbon...",
  risk_context: "Kasbon Toko Makmur sudah lewat 15 hari.",
  created_at: new Date().toISOString(),
};

function App() {
  const { state, loading, error } = useBusinessState("demo-user");

  if (error) {
    return (
      <div className="app-shell--error">
        <p className="text-critical">Koneksi Database Gagal: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      {loading ? (
        <ShimmerLoader message="Menghubungkan ke pusat data..." />
      ) : state ? (
        <PulseDashboard state={state} />
      ) : (
        <div className="glass-panel" style={{ padding: 'var(--fa-space-lg)', margin: '0 var(--fa-space-lg)' }}>
           <p className="text-muted">Data belum tersedia. Silakan jalankan backend untuk inisialisasi state.</p>
        </div>
      )}
    </>
  );
}

export default App;
