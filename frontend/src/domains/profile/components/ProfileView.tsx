/**
 * ProfileView — Shop profile and settings page.
 *
 * Displays business context (used by AI), detailed health summary,
 * and user settings.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../../../core/ui";
import { useBusinessState } from "../../liquidity/hooks/useBusinessState";
import "./ProfileView.css";

export function ProfileView() {
  const { state, loading } = useBusinessState();
  const navigate = useNavigate();

  // Setup Modal State
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [formData, setFormData] = useState({
    cash: 0,
    bank: 0,
    inventory: 0,
    receivables: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    alert("Anda telah keluar.");
    navigate("/");
  };

  const handleComingSoon = () => {
    alert("Fitur ini sedang dalam tahap pengembangan (Coming Soon)");
  };

  const handleSaveInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const body = new URLSearchParams();
      body.append("uid", "test-user-v050");
      body.append("cash", formData.cash.toString());
      body.append("bank", formData.bank.toString());
      body.append("inventory", formData.inventory.toString());
      body.append("receivables", formData.receivables.toString());

      const res = await fetch(`${apiBase}/api/initial-setup`, {
        method: "POST",
        body: body,
      });

      if (!res.ok) throw new Error("Gagal menyimpan saldo awal");
      
      alert("Saldo awal berhasil disimpan!");
      setIsSetupOpen(false);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    const confirmFirst = window.confirm(
      "PERINGATAN: Anda akan menghapus seluruh histori transaksi, histori aksi AI, dan mereset saldo ke nol.\n\nApakah Anda yakin?"
    );
    if (!confirmFirst) return;

    const confirmSecond = window.confirm(
      "Tindakan ini PERMANEN. Klik OK untuk menghapus semuanya."
    );
    if (!confirmSecond) return;

    setIsSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const body = new URLSearchParams();
      body.append("uid", "test-user-v050");

      const res = await fetch(`${apiBase}/api/reset`, {
        method: "POST",
        body: body,
      });

      if (!res.ok) throw new Error("Gagal mereset data");

      alert("Seluruh data berhasil dihapus. Aplikasi akan dimuat ulang.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mereset data.");
    } finally {
      setIsSaving(false);
    }
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
                    {(state.ai_metrics?.health_score || 0).toFixed(2)}
                  </span>
                  <span className={`health-summary__badge health-summary__badge--${state.ai_metrics?.liquidity_risk_level || 'low'}`}>
                    {(state.ai_metrics?.liquidity_risk_level || 'LOW').toUpperCase()}
                  </span>
                </div>
                <p className="health-summary__desc text-caption">
                  {(state.ai_metrics?.health_score || 0) >= 1.5 
                    ? "Bisnis Anda dalam kondisi prima. Fokus pada ekspansi dan penjagaan dead stock."
                    : "Peringatan: Arus kas sedang kritis. AI menyarankan untuk menagih piutang yang jatuh tempo."}
                </p>
                <div className="health-summary__stats">
                  <div className="health-summary__stat">
                    <span className="health-summary__stat-label">Ketahanan Kas (Hari)</span>
                    <span className="health-summary__stat-value">{state.ai_metrics?.cash_runway_days || 0} Hari</span>
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
            <button className="settings-btn" onClick={() => setIsSetupOpen(true)}>
              <span className="settings-btn__icon">💰</span>
              <span className="settings-btn__label">Atur Saldo Awal</span>
              <span className="settings-btn__arrow">›</span>
            </button>
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

        {/* ── Danger Zone ─────────────────────────────────────────── */}
        <div className="profile-section">
          <h2 className="profile-section__title text-danger">Zona Bahaya</h2>
          <GlassCard variant="default" className="profile-card profile-card--danger">
            <p className="text-caption mb-2">Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan.</p>
            <button 
              className="settings-btn settings-btn--destructive"
              onClick={handleResetData}
              disabled={isSaving}
            >
              <span className="settings-btn__icon">🧹</span>
              <span className="settings-btn__label">{isSaving ? "Mereset..." : "Hapus & Reset Seluruh Data"}</span>
            </button>
          </GlassCard>
        </div>

        <p className="profile-version">FlowAgent v0.6.0</p>
      </div>

      {/* ── Setup Modal Overlay ───────────────────────────────────── */}
      {isSetupOpen && (
        <div className="setup-overlay">
          <GlassCard variant="default" className="setup-modal fade-slide-up">
            <h2 className="setup-modal__title">Atur Posisi Keuangan</h2>
            <p className="setup-modal__subtitle">Masukkan saldo awal Anda untuk memulai analisis AI.</p>
            
            <form onSubmit={handleSaveInitialSetup} className="setup-form">
              <div className="setup-form__group">
                <label>Kas di Tangan (Tunai)</label>
                <input 
                  type="number" 
                  value={formData.cash}
                  onChange={(e) => setFormData({...formData, cash: parseInt(e.target.value) || 0})}
                  placeholder="Contoh: 5000000"
                />
              </div>
              <div className="setup-form__group">
                <label>Saldo Bank (Digital)</label>
                <input 
                  type="number" 
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: parseInt(e.target.value) || 0})}
                  placeholder="Contoh: 15000000"
                />
              </div>
              <div className="setup-form__group">
                <label>Estimasi Nilai Stok/Inventaris</label>
                <input 
                  type="number" 
                  value={formData.inventory}
                  onChange={(e) => setFormData({...formData, inventory: parseInt(e.target.value) || 0})}
                  placeholder="Contoh: 2000000"
                />
              </div>
              <div className="setup-form__group">
                <label>Total Piutang (Kasbon Pelanggan)</label>
                <input 
                  type="number" 
                  value={formData.receivables}
                  onChange={(e) => setFormData({...formData, receivables: parseInt(e.target.value) || 0})}
                  placeholder="Contoh: 2500000"
                />
              </div>

              <div className="setup-form__actions">
                <button 
                  type="button" 
                  className="setup-btn setup-btn--secondary"
                  onClick={() => setIsSetupOpen(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="setup-btn setup-btn--primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Menyimpan..." : "Simpan Saldo"}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </section>
  );
}
