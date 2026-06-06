import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useTransactions } from "./useTransactions";
import { resetMockDb, updateDoc, doc } from "../../../core/mocks/firebase";

describe("useTransactions Hook", () => {
  beforeEach(() => {
    resetMockDb();
  });

  it("should subscribe to transactions and load sorted data", () => {
    const { result } = renderHook(() => useTransactions("test-user-v050"));

    expect(result.current.loading).toBe(false);
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0].id).toBe("tx-001");
    expect(result.current.transactions[0].entity_name).toBe("Toko Berkah");
    expect(result.current.error).toBeNull();
  });

  it("should add a new transaction and sort by created_at descending", async () => {
    const { result } = renderHook(() => useTransactions("test-user-v050"));

    expect(result.current.transactions).toHaveLength(1);

    // Add a newer transaction
    const newTxDoc = doc({}, "transactions", "tx-002");
    await act(async () => {
      await updateDoc(newTxDoc, {
        uid: "test-user-v050",
        type: "receivable_created",
        amount: 2500000,
        entity_name: "Toko Sejahtera",
        category: "Penjualan",
        due_date: "2024-05-22",
        source_modality: "text",
        confidence_score: 0.99,
        created_at: new Date(Date.now() + 10000).toISOString(),
      });
    });

    expect(result.current.transactions).toHaveLength(2);
    // The first item should be the newer transaction (tx-002)
    expect(result.current.transactions[0].id).toBe("tx-002");
    expect(result.current.transactions[0].entity_name).toBe("Toko Sejahtera");
  });
});
