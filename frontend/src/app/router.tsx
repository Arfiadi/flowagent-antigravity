/**
 * FlowAgent — Application Router & Navigation
 *
 * Configures React Router with three main routes:
 * - "/" Dashboard (Liquidity)
 * - "/ingest" Input (Sense Layer)
 * - "/agent" Action Center (Act Layer)
 *
 * Reference: implementation_plan.md §2.6
 */

import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useState } from "react";

import App from "../App";
import { CameraModal, VoiceRecorder, ReviewCard } from "../domains/ingestion";
import { ActionCenterFeed } from "../domains/agent";
import { MOCK_PAYLOAD, MOCK_ACTIONS } from "../core/mocks/demo-data";

// ─── Bottom Navigation ──────────────────────────────────────────────

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button
        className={`bottom-nav__btn ${location.pathname === "/" ? "active" : ""}`}
        onClick={() => navigate("/")}
      >
        <span className="bottom-nav__icon">📊</span>
        <span className="bottom-nav__label">Dashboard</span>
      </button>

      <div className="bottom-nav__fab-container">
        <button
          className="fab pulse-glow"
          onClick={() => navigate("/ingest")}
          aria-label="Catat Transaksi"
        >
          <span className="bottom-nav__icon">📷</span>
        </button>
      </div>

      <button
        className={`bottom-nav__btn ${location.pathname === "/agent" ? "active" : ""}`}
        onClick={() => navigate("/agent")}
      >
        <span className="bottom-nav__icon">🤖</span>
        <span className="bottom-nav__label">Agent</span>
      </button>
    </nav>
  );
}

// ─── Layout Shell ───────────────────────────────────────────────────

function Layout() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <h1 className="app-shell__logo">
          <span className="text-accent">Flow</span>Agent
        </h1>
        <p className="text-caption">Asisten Finansial UMKM</p>
      </header>

      <main className="app-shell__main app-shell__main--with-nav stagger-children">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}

// ─── Ingestion View ─────────────────────────────────────────────────

function IngestionView() {
  const [showCamera, setShowCamera] = useState(false);
  const [showVoice, setShowVoice] = useState(false);

  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline section-heading">Catat Transaksi</h2>

      <div className="ingest-actions">
        <button
          className="fa-button fa-button--primary fa-button--lg"
          onClick={() => setShowCamera(true)}
        >
          📷 Foto Nota
        </button>
        <button
          className="fa-button fa-button--primary fa-button--lg"
          onClick={() => setShowVoice(true)}
        >
          🎤 Suara
        </button>
      </div>

      <h2 className="text-overline section-heading">Hasil Ekstraksi AI</h2>

      <div className="section-content">
        <ReviewCard
          payload={MOCK_PAYLOAD}
          onApprove={() => {}}
          onEdit={() => {}}
        />
      </div>

      {showCamera && (
        <CameraModal
          onCapture={() => setShowCamera(false)}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showVoice && (
        <VoiceRecorder
          onSend={() => setShowVoice(false)}
          onCancel={() => setShowVoice(false)}
        />
      )}
    </section>
  );
}

// ─── Agent View ─────────────────────────────────────────────────────

function AgentView() {
  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline section-heading">Pusat Aksi AI</h2>

      <div className="section-content">
        <ActionCenterFeed
          actions={MOCK_ACTIONS}
          onApprove={() => {}}
          onReject={() => {}}
        />
      </div>
    </section>
  );
}

// ─── Router Configuration ───────────────────────────────────────────

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <App /> },
      { path: "ingest", element: <IngestionView /> },
      { path: "agent", element: <AgentView /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
