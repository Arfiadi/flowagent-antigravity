/**
 * HistoryView — Transaction history page with filter tabs & date grouping.
 *
 * Displays all transactions from Firestore in real-time,
 * grouped by date, with filter tabs for type filtering.
 * Shows summary totals for income vs expenses.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "../hooks/useTransactions";
import { TransactionItem } from "./TransactionItem";
import { GlassCard } from "../../../core/ui";
import { formatRupiah } from "../../liquidity";
import type { Transaction } from "../../../core/types/schema";
import "./HistoryView.css";

type FilterTab = "all" | "cash_in" | "cash_out" | "receivable_created" | "payable_created";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "cash_in", label: "Masuk" },
  { key: "cash_out", label: "Keluar" },
  { key: "receivable_created", label: "Piutang" },
  { key: "payable_created", label: "Hutang" },
];

/**
 * Group transactions by date label (Hari ini / Kemarin / dd MMM yyyy).
 */
function groupByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  for (const tx of transactions) {
    let label: string;
    try {
      const d = new Date(tx.created_at);
      if (isSameDay(d, today)) label = "Hari Ini";
      else if (isSameDay(d, yesterday)) label = "Kemarin";
      else label = fmt(d);
    } catch {
      label = "Lainnya";
    }

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(tx);
  }

  return groups;
}

export function HistoryView() {
  const { transactions, loading, error } = useTransactions();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const navigate = useNavigate();

  // Filter transactions
  const filtered = useMemo(() => {
    if (activeFilter === "all") return transactions;
    return transactions.filter((tx) => tx.type === activeFilter);
  }, [transactions, activeFilter]);

  // Group by date
  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // Summary totals
  const totalIn = useMemo(
    () => transactions.filter((t) => t.type === "cash_in").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalOut = useMemo(
    () => transactions.filter((t) => t.type === "cash_out").reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  return (
    <section className="history-view fade-slide-up">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="history-view__header">
        <h1 className="history-view__title">RIWAYAT TRANSAKSI</h1>
        <p className="history-view__subtitle text-caption">
          {new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className="history-view__summary">
        <GlassCard variant="default" className="history-summary-card">
          <span className="history-summary-card__label">💰 Pemasukan</span>
          <span className="history-summary-card__value history-summary-card__value--positive">
            {formatRupiah(totalIn)}
          </span>
        </GlassCard>
        <GlassCard variant="default" className="history-summary-card">
          <span className="history-summary-card__label">💸 Pengeluaran</span>
          <span className="history-summary-card__value history-summary-card__value--critical">
            {formatRupiah(totalOut)}
          </span>
        </GlassCard>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────── */}
      <div className="history-view__tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`history-tab ${activeFilter === tab.key ? "history-tab--active" : ""}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Transaction List ───────────────────────────────────────── */}
      <div className="history-view__list">
        {loading && (
          <div className="history-view__loading">
            <div className="history-skeleton" />
            <div className="history-skeleton" />
            <div className="history-skeleton" />
          </div>
        )}

        {error && (
          <p className="history-view__error text-caption">
            ⚠️ Gagal memuat riwayat: {error.message}
          </p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="history-view__empty">
            <span className="history-view__empty-icon">📭</span>
            <p className="history-view__empty-text">
              Belum ada riwayat transaksi.
              <br />
              Mulai catat transaksi pertama kamu!
            </p>
            <button
              className="history-view__empty-btn"
              onClick={() => navigate("/ingest")}
            >
              + Catat Sekarang
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          Array.from(grouped.entries()).map(([dateLabel, txList]) => (
            <div key={dateLabel} className="history-group">
              <div className="history-group__header">
                <span className="history-group__date">{dateLabel}</span>
                <span className="history-group__line" />
              </div>
              <div className="history-group__items">
                {txList.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
