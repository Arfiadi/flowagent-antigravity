import { createBrowserRouter, RouterProvider, Outlet, useNavigate, useLocation } from "react-router-dom";
import App from "../App";
import { CameraModal, VoiceRecorder, ReviewCard } from "../domains/ingestion";
import { ActionCenterFeed } from "../domains/agent";
import type { TransactionPayload, AgentAction } from "../core/types/schema";
import { useState } from "react";

// --- Mock Data for Routing Demo ---
const MOCK_ACTION: AgentAction = {
  id: "demo-001",
  action_type: "whatsapp_collection",
  status: "pending_review",
  target_entity: "Toko Makmur",
  message_body: "Halo Bosku, nitip info kasbon...",
  risk_context: "Kasbon Toko Makmur sudah lewat 15 hari.",
  created_at: new Date().toISOString(),
};

const MOCK_PAYLOAD: TransactionPayload = {
  type: "receivable_created",
  amount: 2_000_000,
  entity: "Pak Budi",
  due_date: "2026-05-22",
  confidence_score: 0.72,
};

// --- Bottom Navigation Component ---
function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      <button 
        className={`bottom-nav__btn ${location.pathname === '/' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <span className="icon">📊</span>
        <span className="label">Dashboard</span>
      </button>
      
      <div className="bottom-nav__fab-container">
        <button 
          className="fab pulse-glow"
          onClick={() => navigate('/ingest')}
        >
          <span className="icon">📷</span>
        </button>
      </div>

      <button 
        className={`bottom-nav__btn ${location.pathname === '/agent' ? 'active' : ''}`}
        onClick={() => navigate('/agent')}
      >
        <span className="icon">🤖</span>
        <span className="label">Agent</span>
      </button>
    </nav>
  );
}

// --- Layout Component ---
function Layout() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__logo">
          <span className="text-accent">Flow</span>Agent
        </h1>
        <p className="text-caption">Asisten Finansial UMKM</p>
      </header>

      <main className="app-shell__main stagger-children" style={{ paddingBottom: '80px' }}>
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

// --- Ingestion View ---
function IngestionView() {
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline" style={{ padding: "0 var(--fa-space-lg)" }}>
        Catat Transaksi
      </h2>
      <div style={{ padding: "0 var(--fa-space-lg)", display: 'flex', gap: 'var(--fa-space-md)', justifyContent: 'center', marginBottom: 'var(--fa-space-xl)' }}>
         <button className="fa-button fa-button--primary fa-button--lg" onClick={() => setShowCamera(true)}>
           📷 Foto Nota
         </button>
         <button className="fa-button fa-button--primary fa-button--lg" onClick={() => setShowVoice(true)}>
           🎤 Suara
         </button>
      </div>

      <h2 className="text-overline" style={{ padding: "0 var(--fa-space-lg)" }}>
        Hasil Ekstraksi AI
      </h2>
      <div style={{ padding: "0 var(--fa-space-lg)" }}>
        <ReviewCard
          payload={MOCK_PAYLOAD}
          onApprove={() => {}}
          onEdit={() => {}}
        />
      </div>

      {showCamera && <CameraModal onCapture={() => setShowCamera(false)} onClose={() => setShowCamera(false)} />}
      {showVoice && <VoiceRecorder onSend={() => setShowVoice(false)} onCancel={() => setShowVoice(false)} />}
    </section>
  );
}

// --- Agent View ---
function AgentView() {
  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline" style={{ padding: "0 var(--fa-space-lg)" }}>
        Pusat Aksi AI
      </h2>
      <div style={{ padding: "0 var(--fa-space-lg)" }}>
        <ActionCenterFeed
          actions={[MOCK_ACTION]}
          onApprove={() => {}}
          onReject={() => {}}
        />
      </div>
    </section>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <App />, // App now just renders the Dashboard
      },
      {
        path: "/ingest",
        element: <IngestionView />,
      },
      {
        path: "/agent",
        element: <AgentView />,
      }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
