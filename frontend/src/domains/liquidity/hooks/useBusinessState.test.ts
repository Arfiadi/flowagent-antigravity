import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBusinessState } from "./useBusinessState";
import { onSnapshot, doc } from "firebase/firestore";

vi.mock("firebase/firestore", () => {
  return {
    doc: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

vi.mock("../../../core/config/firebase", () => {
  return {
    db: {},
  };
});

describe("useBusinessState", () => {
  const mockUid = "test-user-123";
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);
  });

  it("should initialize with loading=true, state=null, error=null", () => {
    const { result } = renderHook(() => useBusinessState(mockUid));
    expect(result.current.loading).toBe(true);
    expect(result.current.state).toBeNull();
    expect(result.current.error).toBeNull();
    expect(doc).toHaveBeenCalledWith(expect.anything(), "business_state", mockUid);
    expect(onSnapshot).toHaveBeenCalled();
  });

  it("should update state and loading when onSnapshot triggers success callback", () => {
    let snapshotCallback: any;
    vi.mocked(onSnapshot).mockImplementation((_ref, onNext, _onError) => {
      snapshotCallback = onNext;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useBusinessState(mockUid));

    // Initially loading
    expect(result.current.loading).toBe(true);

    const mockData = {
      liquid_assets: {
        cash_on_hand: 50000000,
        bank_balance: 150000000,
        uncategorized_inflows: 12000000,
        last_updated: "2026-06-06T12:00:00Z"
      },
      trapped_capital: {
        receivables: [],
        receivables_total: 0,
        aging_receivables_metrics: {
          below_15d: 0,
          "15d_to_30d": 0,
          above_30d: 0
        },
        inventory_estimate: 25000000,
        dead_stock_value: 5000000
      },
      liabilities: {
        payables: [],
        payables_total: 0,
        upcoming_opex: 30000000
      },
      ai_metrics: {
        cash_runway_days: 120,
        liquidity_risk_level: "low" as const,
        health_score: 85,
        gross_revenue: 75000000,
        net_margin: 0.15,
        days_sales_outstanding_dso: 14
      }
    };

    const mockSnapshot = {
      exists: () => true,
      data: () => mockData,
    };

    // Trigger snapshot
    act(() => {
      snapshotCallback(mockSnapshot);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.state).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should set error and loading=false when onSnapshot triggers error callback", () => {
    let errorCallback: any;
    vi.mocked(onSnapshot).mockImplementation((_ref, _onNext, onError) => {
      errorCallback = onError;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useBusinessState(mockUid));

    const mockError = new Error("Firestore permission denied");

    act(() => {
      errorCallback(mockError);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.state).toBeNull();
    expect(result.current.error).toBe(mockError);
  });

  it("should unsubscribe on unmount", () => {
    const { unmount } = renderHook(() => useBusinessState(mockUid));
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
