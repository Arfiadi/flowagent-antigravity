/**
 * FlowAgent — Application Router & Navigation
 *
 * Configures React Router with four main routes:
 * - "/" Dashboard (Liquidity)
 * - "/history" Transaction History
 * - "/ingest" Input (Sense Layer)
 * - "/agent" Action Center (Act Layer)
 * - "/profile" Shop Profile (Context Layer)
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
import { Button } from "../core/ui";
import type { TransactionPayload } from "../core/types/schema";
import { useAgentActions } from "../domains/agent/hooks/useAgentActions";
import { HistoryView } from "../domains/history";
import { ProfileView } from "../domains/profile";

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

      <button
        className={`bottom-nav__btn ${location.pathname === "/history" ? "active" : ""}`}
        onClick={() => navigate("/history")}
      >
        <span className="bottom-nav__icon">📜</span>
        <span className="bottom-nav__label">Riwayat</span>
      </button>

      <div className="bottom-nav__fab-container">
        <button
          className="fab pulse-glow"
          onClick={() => navigate("/ingest")}
          aria-label="Catat Transaksi"
        >
          <span>+</span>
        </button>
      </div>

      <button
        className={`bottom-nav__btn ${location.pathname === "/agent" ? "active" : ""}`}
        onClick={() => navigate("/agent")}
      >
        <span className="bottom-nav__icon">🤖</span>
        <span className="bottom-nav__label">Agent</span>
      </button>

      <button
        className={`bottom-nav__btn ${location.pathname === "/profile" ? "active" : ""}`}
        onClick={() => navigate("/profile")}
      >
        <span className="bottom-nav__icon">👤</span>
        <span className="bottom-nav__label">Toko</span>
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
  const [payload, setPayload] = useState<TransactionPayload | null>(MOCK_PAYLOAD);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const handleCapture = async (blob: Blob, modality: string) => {
    setLoading(true);
    setShowCamera(false);
    setShowVoice(false);

    const formData = new FormData();
    formData.append("file", blob);
    formData.append("modality", modality);
    formData.append("uid", "demo-user");

    try {
      const response = await fetch("http://localhost:8001/api/extract", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setPayload(data);
    } catch (err) {
      console.error("Extraction failed:", err);
      alert("Gagal mengekstrak data. Pastikan backend menyala di port 8001.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (p: TransactionPayload) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("payload_json", JSON.stringify(p));
      formData.append("uid", "demo-user");

      const response = await fetch("http://localhost:8001/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      alert(`Berhasil! Health Score sekarang: ${data.health_score}`);
      setPayload(null);
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const [textInput, setTextInput] = useState("");

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("text", textInput);
      formData.append("uid", "demo-user");
      formData.append("modality", "text");

      const response = await fetch("http://localhost:8001/api/extract", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setPayload(data);
      setTextInput("");
    } catch (err) {
      console.error("Text extraction failed:", err);
      alert("Gagal memproses teks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline section-heading">Catat Transaksi</h2>

      <div className="ingest-actions">
        <button
          className="fa-button fa-button--primary fa-button--lg"
          onClick={() => setShowCamera(true)}
          disabled={loading}
        >
          {loading ? "Memproses..." : "📷 Foto Nota"}
        </button>
        <button
          className="fa-button fa-button--primary fa-button--lg"
          onClick={() => setShowVoice(true)}
          disabled={loading}
        >
          {loading ? "Mendengarkan..." : "🎤 Suara"}
        </button>
      </div>

      <div className="text-input-area" style={{ marginTop: "1rem" }}>
        <textarea
          className="fa-textarea"
          placeholder="Ketik detail transaksi (contoh: Bayar hutang ke Toko Abadi 500rb)"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={loading}
          style={{ width: "100%", padding: "1rem", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", minHeight: "100px" }}
        />
        <Button
          variant="accent"
          size="sm"
          onClick={handleTextSubmit}
          disabled={loading || !textInput.trim()}
          style={{ marginTop: "0.5rem", width: "100%" }}
        >
          Kirim Teks
        </Button>
      </div>

      <h2 className="text-overline section-heading">Hasil Ekstraksi AI</h2>

      <div className="section-content">
        {payload ? (
          <ReviewCard
            payload={payload}
            onApprove={handleApprove}
            capturedImage={capturedImage}
          />
        ) : (
          <p className="text-caption" style={{ textAlign: "center", marginTop: "2rem" }}>
            Belum ada data yang diekstrak. Silakan foto nota atau rekam suara.
          </p>
        )}
      </div>

      {showCamera && (
        <CameraModal
          onCapture={(base64) => {
            setCapturedImage(base64);
            // Convert base64 to blob for API
            fetch(base64).then(r => r.blob()).then(blob => handleCapture(blob, "photo"));
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {showVoice && (
        <VoiceRecorder
          onSend={(blob) => handleCapture(blob, "voice")}
          onCancel={() => setShowVoice(false)}
        />
      )}
    </section>
  );
}

function AgentView() {
  const { actions, loading, error, updateActionStatus } = useAgentActions("demo-user");

  if (error) {
    return (
      <section className="app-shell__section fade-slide-up">
        <h2 className="text-overline section-heading">Pusat Aksi AI</h2>
        <div className="section-content text-critical">
          Gagal memuat aksi: {error.message}
        </div>
      </section>
    );
  }

  return (
    <section className="app-shell__section fade-slide-up">
      <h2 className="text-overline section-heading">Pusat Aksi AI</h2>

      <div className="section-content">
        {loading ? (
          <p className="text-caption text-center">Memuat rekomendasi AI...</p>
        ) : actions.length > 0 ? (
          <ActionCenterFeed
            actions={actions}
            onApprove={(id) => updateActionStatus(id, "approved")}
            onReject={(id) => updateActionStatus(id, "rejected")}
          />
        ) : (
          <p className="text-caption text-center" style={{ marginTop: "2rem" }}>
            Tidak ada aksi darurat saat ini. AI menganggap keuangan aman.
          </p>
        )}
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
      { path: "history", element: <HistoryView /> },
      { path: "profile", element: <ProfileView /> },
      { path: "ingest", element: <IngestionView /> },
      { path: "agent", element: <AgentView /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
