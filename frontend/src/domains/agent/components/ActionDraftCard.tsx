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

const ACTION_UI_CONFIG: Record<AgentAction["action_type"], { label: string; colorClass: string; icon: string }> = {
  whatsapp_collection: { label: "Penagihan WhatsApp", colorClass: "action-card--positive", icon: "📱" },
  supplier_negotiation: { label: "Negosiasi Supplier", colorClass: "action-card--warning", icon: "🤝" },
  stock_warning: { label: "Peringatan Stok", colorClass: "action-card--critical", icon: "📦" },
};

export function ActionDraftCard({
  action,
  onApprove,
  onReject,
}: ActionDraftCardProps) {
  const isPending = action.status === "pending_review";
  const config = ACTION_UI_CONFIG[action.action_type];

  return (
    <GlassCard
      variant="default"
      className={`action-card ${config.colorClass} fade-slide-up ${!isPending ? "action-card--resolved" : ""}`}
    >
      {/* Header */}
      <div className="action-card__header">
        <div className="action-card__badge">
          <span className="action-card__icon">{config.icon}</span>
          <span className="action-card__type text-overline">{config.label}</span>
        </div>
        <span className="action-card__target text-subheading">
          {action.target_entity}
        </span>
      </div>

      {/* Message preview */}
      <div className="action-card__message-container">
        <blockquote className="action-card__message">
          "{action.message_body}"
        </blockquote>
      </div>

      {/* Risk context */}
      <p className="action-card__context text-caption">
        <span className="action-card__context-icon">💡</span>
        <span>{action.risk_context}</span>
      </p>

      {/* Actions */}
      {isPending && (
        <div className="action-card__actions">
          <Button variant="ghost" size="sm" onClick={() => onReject(action)}>
            Tolak
          </Button>
          <Button variant="accent" size="sm" onClick={() => onApprove(action)}>
            Setujui & Kirim
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
