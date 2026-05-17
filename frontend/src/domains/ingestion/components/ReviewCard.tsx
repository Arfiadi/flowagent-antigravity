/**
 * ReviewCard — Guardrail card for AI extraction review
 *
 * Source of truth: ui_ux_design.md §3.B, domain_specs.md §1.B
 * Shows extracted data and requires user approval before sync.
 * Low-confidence extractions are highlighted in Amber.
 *
 * v0.6.0: Redesigned with image preview, editable form grid,
 *         and full-width CTA button matching fintech premium aesthetic.
 */

import { useState } from "react";
import type { TransactionPayload } from "../../../core/types/schema";
import { CONFIDENCE_THRESHOLD } from "../../../core/types/schema";
import { GlassCard } from "../../../core/ui";
import { formatRupiah } from "../../liquidity";
import "./ReviewCard.css";

interface ReviewCardProps {
  /** Extracted transaction data from AI */
  payload: TransactionPayload;
  /** Called when user approves the extraction */
  onApprove: (payload: TransactionPayload) => void;
  /** Optional captured image (base64) for preview */
  capturedImage?: string | null;
  /** Called when user discards the extraction result */
  onCancel?: () => void;
  /** State indicating if submission is in progress */
  loading?: boolean;
}

const TYPE_LABELS: Record<TransactionPayload["type"], string> = {
  cash_in: "PEMASUKAN",
  cash_out: "PENGELUARAN (STOK)",
  receivable_created: "PIUTANG BARU (KASBON)",
  receivable_paid: "PELUNASAN PIUTANG",
  payable_created: "HUTANG BARU",
  payable_paid: "PEMBAYARAN HUTANG",
};

const TYPE_ICONS: Record<TransactionPayload["type"], string> = {
  cash_in: "💰",
  cash_out: "📦",
  receivable_created: "📝",
  receivable_paid: "✅",
  payable_created: "🏦",
  payable_paid: "💸",
};

export function ReviewCard({ payload: initialPayload, onApprove, capturedImage, onCancel, loading = false }: ReviewCardProps) {
  const [edited, setEdited] = useState(initialPayload);
  const [notes, setNotes] = useState("");

  const isLowConfidence = initialPayload.confidence_score < CONFIDENCE_THRESHOLD;
  const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const handleApprove = () => {
    if (loading) return;
    onApprove(edited);
  };

  return (
    <div className="review-section fade-slide-up">
      <h2 className="review-section__title">TINJAU HASIL EKSTRAKSI AI</h2>

      {/* ── Image Preview ──────────────────────────────────── */}
      {capturedImage && (
        <GlassCard variant="default" className="review-preview">
          <div className="review-preview__header">
            <span className="review-preview__label text-overline">PRATINJAU NOTA ASLI</span>
            <span className="review-preview__badge">Pindai Nota (OCR)</span>
          </div>
          <div className="review-preview__image-container">
            <img
              src={capturedImage}
              alt="Nota yang difoto"
              className="review-preview__image"
            />
          </div>
        </GlassCard>
      )}

      {/* ── Editable Draft Form ────────────────────────────── */}
      <GlassCard
        variant="default"
        className={`review-card ${isLowConfidence ? "review-card--warning" : ""}`}
      >
        {/* Header */}
        <div className="review-card__header">
          <span className="review-card__header-title text-overline">
            DRAF TRANSAKSI AI (Dapat Diedit)
          </span>
          <div className="review-card__actions">
            <div className="review-card__confidence">
              <span className="text-overline" style={{ fontSize: "0.6rem" }}>
                AI: {Math.round(initialPayload.confidence_score * 100)}%
              </span>
              {isLowConfidence && (
                <span className="review-card__warning-badge">⚠ Verifikasi</span>
              )}
            </div>
            {onCancel && (
              <button
                className="review-card__cancel-btn"
                onClick={onCancel}
                title="Batalkan Ekstraksi"
                disabled={loading}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Form Grid */}
        <div className="review-card__body">
          {/* Tanggal */}
          <div className="review-card__field">
            <span className="review-card__field-label">Tanggal:</span>
            <div className="review-card__field-row">
              <span className="review-card__field-icon">📅</span>
              <input
                type="text"
                className="review-card__field-input"
                value={todayStr}
                readOnly
              />
            </div>
          </div>

          {/* Entitas */}
          <div className="review-card__field">
            <span className="review-card__field-label">Entitas:</span>
            <div className="review-card__field-row">
              <span className="review-card__field-icon">👤</span>
              <input
                type="text"
                className="review-card__field-input"
                value={edited.entity_name}
                onChange={(e) => setEdited({ ...edited, entity_name: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Jenis Transaksi (Badge) */}
          <div className="review-card__type-row">
            <span className="review-card__field-icon">✏️</span>
            <span className="review-card__type-badge">
              {TYPE_ICONS[edited.type]} {TYPE_LABELS[edited.type]}
            </span>
          </div>

          {/* Jumlah Total */}
          <div className="review-card__field">
            <span className="review-card__field-label">Jumlah Total:</span>
            <div className={`review-card__field-row ${isLowConfidence ? "review-card__field-row--warning" : ""}`}>
              <span className="review-card__field-icon">💰</span>
              <input
                type="text"
                className="review-card__field-input"
                value={formatRupiah(edited.amount)}
                onChange={(e) => {
                  const num = Number(e.target.value.replace(/[^0-9]/g, ""));
                  if (!isNaN(num)) setEdited({ ...edited, amount: num });
                }}
                disabled={loading}
              />
              {isLowConfidence && <span style={{ color: "var(--fa-color-warning)" }}>⚠</span>}
            </div>
          </div>

          {/* Kategori */}
          <div className="review-card__field">
            <span className="review-card__field-label">Kategori:</span>
            <div className="review-card__field-row">
              <span className="review-card__field-icon">🏷️</span>
              <input
                type="text"
                className="review-card__field-input"
                placeholder="Misal: Stok, Operasional"
                value={edited.category}
                onChange={(e) => setEdited({ ...edited, category: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Low confidence warning */}
          {isLowConfidence && (
            <p className="review-card__warning-text">
              *Akurasi rendah pada Total (coretan tangan). Harap periksa kembali.*
            </p>
          )}

          {/* Catatan */}
          <div className="review-card__notes">
            <span className="review-card__field-label">Catatan:</span>
            <textarea
              className="review-card__notes-textarea"
              placeholder="*Optional field text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Full-width CTA */}
        <button 
          className="review-card__approve-btn" 
          onClick={handleApprove}
          disabled={loading}
        >
          {loading ? "📡 MENYIMPAN..." : "📡 SETUJU DAN SIMPAN"}
        </button>
      </GlassCard>
    </div>
  );
}

