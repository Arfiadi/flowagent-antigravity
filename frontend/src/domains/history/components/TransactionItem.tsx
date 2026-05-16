/**
 * TransactionItem — Single transaction card for History view.
 * Redesigned as a "Digital Receipt / AI Log" for better UX.
 */

import type { Transaction } from "../../../core/types/schema";
import { formatRupiah } from "../../liquidity";
import "./TransactionItem.css";

interface TransactionItemProps {
  tx: Transaction;
}

const CATEGORY_ICONS: Record<string, string> = {
  stok: "📦",
  operasional: "🧾",
  gaji: "👤",
  prive: "💸",
  penjualan: "💰",
  piutang: "📝",
  lainnya: "📋",
};

const MODALITY_LABELS: Record<string, { icon: string; label: string }> = {
  photo: { icon: "📷", label: "Foto" },
  voice: { icon: "🎙️", label: "Suara" },
  text: { icon: "💬", label: "Teks" },
  manual: { icon: "✏️", label: "Manual" },
};

const TYPE_COLORS: Record<string, string> = {
  cash_in: "positive",
  cash_out: "critical",
  receivable_created: "warning",
  payable_created: "critical",
};

const TYPE_LABELS: Record<string, string> = {
  cash_in: "PEMASUKAN",
  cash_out: "PENGELUARAN",
  receivable_created: "PIUTANG",
  payable_created: "HUTANG",
};

const TYPE_PREFIXES: Record<string, string> = {
  cash_in: "Diterima dari",
  cash_out: "Dibayar kepada",
  receivable_created: "Piutang dari",
  payable_created: "Hutang kepada",
};

export function TransactionItem({ tx }: TransactionItemProps) {
  const categoryKey = (tx.category || "lainnya").toLowerCase();
  const categoryIcon = CATEGORY_ICONS[categoryKey] || "📋";
  const modality = MODALITY_LABELS[tx.source_modality] || MODALITY_LABELS.manual;
  
  const colorClass = TYPE_COLORS[tx.type] || "default";
  const typeLabel = TYPE_LABELS[tx.type] || "TRANSAKSI";
  const entityPrefix = TYPE_PREFIXES[tx.type] || "Entitas:";
  
  const isHighConfidence = tx.confidence_score >= 0.85;

  // Format time
  const time = (() => {
    try {
      const d = new Date(tx.created_at);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  })();

  return (
    <div 
      className={`tx-card tx-card--${colorClass}`}
      onClick={() => alert("Fitur Detail Transaksi akan segera hadir")}
      style={{ cursor: "pointer" }}
    >
      {/* ── Header: Type & Time ── */}
      <div className="tx-card__header">
        <span className={`tx-card__type tx-card__type--${colorClass}`}>
          {typeLabel}
        </span>
        <span className="tx-card__time">{time}</span>
      </div>

      {/* ── Body: Amount & Entity ── */}
      <div className="tx-card__body">
        <div className={`tx-card__amount tx-card__amount--${colorClass}`}>
          {formatRupiah(tx.amount)}
        </div>
        <div className="tx-card__entity-wrapper">
          <span className="tx-card__entity-prefix">{entityPrefix}</span>
          <span className="tx-card__entity-name">{tx.entity_name}</span>
        </div>
      </div>

      {/* ── Footer: AI Metadata ── */}
      <div className="tx-card__footer">
        <div className="tx-meta-badge">
          <span className="tx-meta-badge__icon">{categoryIcon}</span>
          <span className="tx-meta-badge__text">{tx.category || "Lainnya"}</span>
        </div>
        
        <div className="tx-meta-badge">
          <span className="tx-meta-badge__icon">{modality.icon}</span>
          <span className="tx-meta-badge__text">Via {modality.label}</span>
        </div>

        <div className="tx-meta-badge tx-meta-badge--confidence">
          <span className={`tx-confidence-dot ${isHighConfidence ? "tx-confidence-dot--high" : "tx-confidence-dot--low"}`} />
          <span className="tx-meta-badge__text">Akurasi {Math.round(tx.confidence_score * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
