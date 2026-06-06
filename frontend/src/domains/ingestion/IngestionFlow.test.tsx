import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { IngestionView } from "../../app/router";
import type { TransactionPayload } from "../../core/types/schema";

describe("IngestionFlow Integration Test", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  it("should simulate inputting text, submitting to API, rendering ReviewCard, and approving", async () => {
    const mockPayload: TransactionPayload = {
      type: "cash_in",
      amount: 500000,
      entity_name: "Toko Abadi",
      category: "Penjualan",
      due_date: null,
      confidence_score: 0.95,
    };

    mockFetch.mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : (url as any).url;
      if (urlStr.includes("/api/extract")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPayload),
        } as Response);
      }
      if (urlStr.includes("/api/analyze")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ health_score: 1.9 }),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled fetch to ${urlStr}`));
    });

    const mockAlert = vi.fn();
    vi.stubGlobal("alert", mockAlert);

    render(<IngestionView />);

    // Check text input field exists
    expect(screen.getByPlaceholderText(/Ketik detail transaksi/i)).toBeInTheDocument();

    // Type transaction info
    const textarea = screen.getByPlaceholderText(/Ketik detail transaksi/i);
    fireEvent.change(textarea, { target: { value: "Bayar hutang ke Toko Abadi 500rb" } });

    // Submit text to API
    const submitBtn = screen.getByRole("button", { name: /Kirim Teks/i });
    fireEvent.click(submitBtn);

    // Verify ReviewCard is rendered with details
    await waitFor(() => {
      expect(screen.getByText(/TINJAU HASIL EKSTRAKSI AI/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("Toko Abadi")).toBeInTheDocument();
    
    // Amount field has Rupiah formatting in UI, so let's verify display value
    expect(screen.getByDisplayValue(/500\.000/)).toBeInTheDocument();

    // Approve transaction
    const approveBtn = screen.getByRole("button", { name: /SETUJU DAN SIMPAN/i });
    fireEvent.click(approveBtn);

    // Verify /api/analyze is triggered
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    const analyzeCall = mockFetch.mock.calls.find((call) => {
      const urlStr = typeof call[0] === "string" ? call[0] : (call[0] as any).url;
      return urlStr.includes("/api/analyze");
    });
    expect(analyzeCall).toBeDefined();

    const callOptions = analyzeCall![1] as RequestInit;
    const body = callOptions.body as FormData;
    expect(body.get("payload_json")).toBe(JSON.stringify(mockPayload));
    expect(body.get("uid")).toBe("test-user-v050");

    expect(mockAlert).toHaveBeenCalledWith("Berhasil! Health Score sekarang: 1.9");
  });
});
