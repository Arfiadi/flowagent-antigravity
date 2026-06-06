import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionDraftCard } from "./ActionDraftCard";
import type { AgentAction } from "../../../core/types/schema";

describe("ActionDraftCard", () => {
  const pendingAction: AgentAction = {
    id: "action-123",
    action_type: "whatsapp_collection",
    status: "pending_review",
    target_entity: "Budi Santoso",
    message_body: "Halo Budi, mohon pembayaran piutang Rp 500.000",
    risk_context: "Piutang jatuh tempo hari ini",
    created_at: "2026-06-06T12:00:00Z",
  };

  const resolvedAction: AgentAction = {
    ...pendingAction,
    status: "approved",
  };

  it("renders action data properly (labels, entity, message, risk context)", () => {
    const { container } = render(
      <ActionDraftCard
        action={pendingAction}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    // Verify type badge config (whatsapp_collection -> Penagihan WhatsApp, 📱)
    expect(screen.getByText("Penagihan WhatsApp")).not.toBeNull();
    expect(screen.getByText("📱")).not.toBeNull();

    // Verify target entity
    expect(screen.getByText("Budi Santoso")).not.toBeNull();

    // Verify message body (check without quotes)
    expect(screen.getByText(/Halo Budi, mohon pembayaran piutang/)).not.toBeNull();

    // Verify risk context
    expect(screen.getByText(/Piutang jatuh tempo hari ini/)).not.toBeNull();

    // Verify specific wrapper classes applied
    const cardElement = container.querySelector(".action-card");
    expect(cardElement?.classList.contains("action-card--positive")).toBe(true);
    expect(cardElement?.classList.contains("action-card--resolved")).toBe(false);
  });

  it("conditionally renders review buttons only when status is pending_review", () => {
    // Case 1: Pending action should have review buttons
    const { rerender } = render(
      <ActionDraftCard
        action={pendingAction}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Tolak/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Setujui/i })).not.toBeNull();

    // Case 2: Resolved action should not have review buttons
    rerender(
      <ActionDraftCard
        action={resolvedAction}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Tolak/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Setujui/i })).toBeNull();
  });

  it("triggers button click handlers with correct action payload", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ActionDraftCard
        action={pendingAction}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    const approveButton = screen.getByRole("button", { name: /Setujui/i });
    fireEvent.click(approveButton);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith(pendingAction);

    const rejectButton = screen.getByRole("button", { name: /Tolak/i });
    fireEvent.click(rejectButton);
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledWith(pendingAction);
  });
});
