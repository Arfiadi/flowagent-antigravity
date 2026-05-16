import type { AgentAction } from "../../../core/types/schema";
import { ActionDraftCard } from "./ActionDraftCard";

interface ActionCenterFeedProps {
  actions: AgentAction[];
  onApprove: (action: AgentAction) => void;
  onReject: (action: AgentAction) => void;
}

export function ActionCenterFeed({ actions, onApprove, onReject }: ActionCenterFeedProps) {
  if (!actions || actions.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--fa-space-lg)', textAlign: 'center' }}>
        <p className="text-muted">Tidak ada rekomendasi aksi AI saat ini.</p>
      </div>
    );
  }

  return (
    <div className="action-feed stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--fa-space-md)' }}>
      {actions.map((action) => (
        <ActionDraftCard
          key={action.id}
          action={action}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
