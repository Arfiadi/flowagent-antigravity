import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewCard } from "./ReviewCard";
import type { TransactionPayload } from "../../../core/types/schema";

describe("ReviewCard", () => {
  const mockPayload: TransactionPayload = {
    type: "cash_in",
    amount: 150000,
    entity_name: "Toko Budi",
    category: "Penjualan Sembako",
    due_date: null,
    confidence_score: 0.9,
  };

  it("renders with correct field mapping (IDR format amount, transaction type)", () => {
    const onApprove = vi.fn();
    const onCancel = vi.fn();

    render(
      <ReviewCard
        payload={mockPayload}
        onApprove={onApprove}
        onCancel={onCancel}
      />
    );

    // Verify entity name
    const entityInput = screen.getByDisplayValue("Toko Budi");
    expect(entityInput).not.toBeNull();

    // Verify amount in IDR format
    const amountInput = screen.getByDisplayValue(/Rp.*150\.000/);
    expect(amountInput).not.toBeNull();

    // Verify transaction type label (cash_in -> PEMASUKAN)
    expect(screen.getByText(/PEMASUKAN/i)).not.toBeNull();
    // Verify transaction type icon
    expect(screen.getAllByText(/💰/).length).toBeGreaterThan(0);
  });

  it("highlights the card in Amber if confidence score is below threshold (0.85)", () => {
    const lowConfidencePayload: TransactionPayload = {
      ...mockPayload,
      confidence_score: 0.8, // below 0.85
    };

    const { container } = render(
      <ReviewCard
        payload={lowConfidencePayload}
        onApprove={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cardElement = container.querySelector(".review-card");
    expect(cardElement?.classList.contains("review-card--warning")).toBe(true);

    expect(screen.getByText(/⚠ Verifikasi/i)).not.toBeNull();
    expect(screen.getByText(/\*Akurasi rendah pada Total/i)).not.toBeNull();
  });

  it("does not highlight the card in Amber if confidence score is above or equal to threshold (0.85)", () => {
    const highConfidencePayload: TransactionPayload = {
      ...mockPayload,
      confidence_score: 0.85,
    };

    const { container } = render(
      <ReviewCard
        payload={highConfidencePayload}
        onApprove={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cardElement = container.querySelector(".review-card");
    expect(cardElement?.classList.contains("review-card--warning")).toBe(false);
    expect(screen.queryByText(/⚠ Verifikasi/i)).toBeNull();
  });

  it("triggers onApprove when the CTA button is clicked", () => {
    const onApprove = vi.fn();
    render(
      <ReviewCard
        payload={mockPayload}
        onApprove={onApprove}
        onCancel={vi.fn()}
      />
    );

    const approveButton = screen.getByRole("button", { name: /SETUJU DAN SIMPAN/i });
    fireEvent.click(approveButton);

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledWith(expect.objectContaining({
      entity_name: "Toko Budi",
      amount: 150000,
    }));
  });

  it("triggers onCancel (onDiscard equivalent) when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ReviewCard
        payload={mockPayload}
        onApprove={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByTitle("Batalkan Ekstraksi");
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
