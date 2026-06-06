import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useAgentActions } from "./useAgentActions";
import { resetMockDb, updateDoc, deleteDoc } from "../../../core/mocks/firebase";

describe("useAgentActions Hook", () => {
  beforeEach(() => {
    resetMockDb();
  });

  it("should load agent actions", () => {
    const { result } = renderHook(() => useAgentActions("test-user-v050"));

    expect(result.current.loading).toBe(false);
    expect(result.current.actions).toHaveLength(1);
    expect(result.current.actions[0].target_entity).toBe("Toko Makmur");
    expect(result.current.actions[0].status).toBe("pending_review");
  });

  it("should update action status to approved", async () => {
    const { result } = renderHook(() => useAgentActions("test-user-v050"));

    await act(async () => {
      await result.current.updateActionStatus("demo-001", "approved");
    });

    expect(updateDoc).toHaveBeenCalled();
    expect(result.current.actions[0].status).toBe("approved");
  });

  it("should delete action if status is rejected", async () => {
    const { result } = renderHook(() => useAgentActions("test-user-v050"));

    await act(async () => {
      await result.current.updateActionStatus("demo-001", "rejected");
    });

    expect(deleteDoc).toHaveBeenCalled();
    expect(result.current.actions).toHaveLength(0);
  });
});
