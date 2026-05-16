/**
 * ProfileView — Shop profile and settings page.
 *
 * Displays business context (used by AI), detailed health summary,
 * and user settings.
 */

import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../../core/ui";
import { useBusinessState } from "../../liquidity/hooks/useBusinessState";
import "./ProfileView.css";

export function ProfileView() {
  const { state, loading } = useBusinessState();
  const navigate = useNavigate();

  const handleLogout = () => {
    alert("Anda telah keluar.");
    navigate("/");
  };

  const handleComingSoon = () => {
    alert("Fitur ini sedang dalam tahap pengembangan (Coming Soon)");
  };

  return (
    <section className="profile-view fade-slide-up">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="profile-view__header">
        <div className="profile-view__avatar">
          <span className="profile-view__avatar-icon">🏪</span>
        </div>
        <h1 className="profile-view__title">Toko Sejahtera</h1>
        <p className="profile-view__subtitle text-caption">Distributor Sembako & Ritel</p>
      </div>

      <div className="profile-view__content">
        {/* ── Ringkasan Bisnis ─────────────────────────────────────── */}
        <div className="profile-section">
          <h2 className="profile-section__title">Konteks Bisnis (AI)</h2>
          <GlassCard variant="default" className="profile-card">
            <div className="profile-list">
              <div className="profile-list__item">
                <span className="profile-list__icon">📍</span>
                <div className="profile-list__text">
                  <span className="profile-list__label">Lokasi</span>
                  <span className="profile-list__value">Bandung, Jawa Barat</span>
                </div>
              </div>
              <div className="profile-list__item">
                <span className="profile-list__icon">👥</span>
                <div className="profile-list__text">
                  <span className="profile-list__label">Karyawan Aktif</span>
                  <span className="profile-list__value">3 Orang</span>
                </div>
              </div>
              <div className="profile-list__item">
                <span className="profile-list__icon">🎯</span>
                <div className="profile-list__text">
                  <span className="profile-list__label">Fokus Utama</span>
                  <span className="profile-list__value">Perputaran Kas Cepat</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── Status Kesehatan (Detail) ────────────────────────────── */}
        <div className="profile-section">
          <h2 className="profile-section__title">Status Kesehatan AI</h2>
          <GlassCard variant="default" className="profile-card">
            {loading ? (
              <p className="text-caption text-center">Memuat data...</p>
            ) : state ? (
              <div className="health-summary">
                <div className="health-summary__header">
                  <span className="health-summary__score">
                    {state.ai_metrics.health_score.toFixed(2)}
                  </span>
                  <span className={`health-summary__badge health-summary__badge--${state.ai_metrics.liquidity_risk_level}`}>
                    {state.ai_metrics.liquidity_risk_level.toUpperCase()}
                  </span>
                </div>
                <p className="health-summary__desc text-caption">
                  {state.ai_metrics.health_score >= 1.5 
                    ? "Bisnis Anda dalam kondisi prima. Fokus pada ekspansi dan penjagaan dead stock."
                    : "Peringatan: Arus kas sedang kritis. AI menyarankan untuk menagih piutang yang jatuh tempo."}
                </p>
                <div className="health-summary__stats">
                  <div className="health-summary__stat">
                    <span className="health-summary__stat-label">Runway Kas</span>
                    <span className="health-summary__stat-value">{state.ai_metrics.cash_runway_days} Hari</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-caption text-center">Data tidak tersedia.</p>
            )}
          </GlassCard>
        </div>

        {/* ── Pengaturan ───────────────────────────────────────────── */}
        <div className="profile-section">
          <h2 className="profile-section__title">Pengaturan</h2>
          <div className="settings-list">
            <button className="settings-btn" onClick={handleComingSoon}>
              <span className="settings-btn__icon">⚙️</span>
              <span className="settings-btn__label">Pengaturan Akun</span>
              <span className="settings-btn__arrow">›</span>
            </button>
            <button className="settings-btn" onClick={handleComingSoon}>
              <span className="settings-btn__icon">🔔</span>
              <span className="settings-btn__label">Notifikasi AI</span>
              <span className="settings-btn__arrow">›</span>
            </button>
            <button 
              className="settings-btn settings-btn--danger"
              onClick={handleLogout}
            >
              <span className="settings-btn__icon">🚪</span>
              <span className="settings-btn__label">Keluar</span>
            </button>
          </div>
        </div>

        <p className="profile-version">FlowAgent v0.6.0</p>
      </div>
    </section>
  );
}
