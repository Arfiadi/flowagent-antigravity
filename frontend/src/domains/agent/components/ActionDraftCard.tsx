/**
 * ActionDraftCard — Individual agent action draft
 *
 * Source of truth: ui_ux_design.md §3.C, domain_specs.md §3.B
 * Displays a draft action from Gemini Pro and allows user approval.
 */

import type { AgentAction } from "../../../core/types/schema";
import { GlassCard, Button } from "../../../core/ui";
import "./ActionDraftCard.css";

interface ActionDraftCardProps {
  action: AgentAction;
  onApprove: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
}

const ACTION_TYPE_LABELS: Record<AgentAction["action_type"], string> = {
  whatsapp_collection: "📱 Penagihan WhatsApp",
  supplier_negotiation: "🤝 Negosiasi Supplier",
  stock_warning: "📦 Peringatan Stok",
};

export function ActionDraftCard({
  action,
  onApprove,
  onReject,
}: ActionDraftCardProps) {
  const isPending = action.status === "pending_review";

  return (
    <GlassCard
      variant="accent"
      className={`action-card fade-slide-up ${!isPending ? "action-card--resolved" : ""}`}
    >
      {/* Header */}
      <div className="action-card__header">
        <span className="action-card__type text-overline">
          {ACTION_TYPE_LABELS[action.action_type]}
        </span>
        <span className="action-card__target text-subheading">
          {action.target_entity}
        </span>
      </div>

      {/* Message preview */}
      <blockquote className="action-card__message">
        "{action.message_body}"
      </blockquote>

      {/* Risk context */}
      <p className="action-card__context text-caption">
        💡 {action.risk_context}
      </p>

      {/* Actions */}
      {isPending && (
        <div className="action-card__actions">
          <Button variant="ghost" size="sm" onClick={() => onReject(action)}>
            Tolak
          </Button>
          <Button variant="positive" size="sm" onClick={() => onApprove(action)}>
            Setujui & Kirim
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
