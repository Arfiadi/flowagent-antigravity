/**
 * ReviewCard — Guardrail card for AI extraction review
 *
 * Source of truth: ui_ux_design.md §3.B, domain_specs.md §1.B
 * Shows extracted data and requires user approval before sync.
 * Low-confidence extractions are highlighted in Amber.
 */

import type { TransactionPayload } from "../../../core/types/schema";
import { CONFIDENCE_THRESHOLD } from "../../../core/types/schema";
import { GlassCard, Button } from "../../../core/ui";
import { formatRupiah } from "../../liquidity";
import "./ReviewCard.css";

interface ReviewCardProps {
  /** Extracted transaction data from AI */
  payload: TransactionPayload;
  /** Called when user approves the extraction */
  onApprove: (payload: TransactionPayload) => void;
  /** Called when user wants to edit */
  onEdit: (payload: TransactionPayload) => void;
}

const TYPE_LABELS: Record<TransactionPayload["type"], string> = {
  cash_in: "Pemasukan",
  cash_out: "Pengeluaran",
  receivable_created: "Piutang Baru (Kasbon)",
  payable_created: "Hutang Baru",
};

export function ReviewCard({ payload, onApprove, onEdit }: ReviewCardProps) {
  const isLowConfidence = payload.confidence_score < CONFIDENCE_THRESHOLD;

  return (
    <GlassCard
      variant={isLowConfidence ? "default" : "accent"}
      className={`review-card fade-slide-up ${isLowConfidence ? "review-card--warning" : ""}`}
    >
      {/* Confidence indicator */}
      <div className="review-card__confidence">
        <span className="text-overline">
          Keyakinan AI: {Math.round(payload.confidence_score * 100)}%
        </span>
        {isLowConfidence && (
          <span className="review-card__warning-badge">⚠ Perlu verifikasi</span>
        )}
      </div>

      {/* Extracted data */}
      <div className="review-card__body">
        <div className="review-card__field">
          <span className="text-caption">Jenis</span>
          <span className="text-body">{TYPE_LABELS[payload.type]}</span>
        </div>
        <div className="review-card__field">
          <span className="text-caption">Pihak</span>
          <span className="text-body">{payload.entity}</span>
        </div>
        <div className="review-card__field">
          <span className="text-caption">Jumlah</span>
          <span className="text-body text-positive">
            {formatRupiah(payload.amount)}
          </span>
        </div>
        {payload.due_date && (
          <div className="review-card__field">
            <span className="text-caption">Jatuh Tempo</span>
            <span className="text-body">{payload.due_date}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="review-card__actions">
        <Button variant="ghost" size="sm" onClick={() => onEdit(payload)}>
          Edit
        </Button>
        <Button variant="primary" size="sm" onClick={() => onApprove(payload)}>
          Setujui & Simpan
        </Button>
      </div>
    </GlassCard>
  );
}
