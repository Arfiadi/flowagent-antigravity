/**
 * FlowAgent — Dashboard View (App.tsx)
 *
 * Renders the Liquidity Dashboard connected to real-time Firestore data.
 * This component is used as the default route "/" in the router.
 */

import { useBusinessState } from "./domains/liquidity/hooks/useBusinessState";
import { PulseDashboard } from "./domains/liquidity";
import { ShimmerLoader } from "./core/ui";
import "./App.css";

function App() {
  const { state, loading, error } = useBusinessState("test-user-v050");

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
        <div className="glass-panel app-shell__empty-state">
          <p className="text-muted">
            Data belum tersedia. Silakan jalankan backend untuk inisialisasi
            state.
          </p>
        </div>
      )}
    </>
  );
}

export default App;
