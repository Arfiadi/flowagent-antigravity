import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AgentView } from "../../app/router";
import * as mockFirebase from "../../core/mocks/firebase";

describe("ActionCenterFlow Integration Test", () => {
  beforeEach(() => {
    // Reset mock Firestore database before each test
    mockFirebase.resetMockDb();
    vi.clearAllMocks();
  });

  it("should render agent action draft and handle approval", async () => {
    render(<AgentView />);

    // Verify loading finished and action card is rendered
    await waitFor(() => {
      expect(screen.getByText("Toko Makmur")).toBeInTheDocument();
    });

    expect(screen.getByText(/Selamat pagi Pak, mau konfirmasi soal tagihan kasbon/i)).toBeInTheDocument();
    expect(screen.getByText(/Kasbon Toko Makmur sudah lewat 15 hari dari jatuh tempo/i)).toBeInTheDocument();

    // Click "Setujui" button
    const approveBtn = screen.getByRole("button", { name: "Setujui" });
    fireEvent.click(approveBtn);

    // Verify Firestore updateDoc is called
    await waitFor(() => {
      expect(mockFirebase.updateDoc).toHaveBeenCalled();
    });

    // Verify updated status in DB
    expect(mockFirebase.mockDbStore.agent_actions["demo-001"].status).toBe("approved");
  });

  it("should handle action rejection by deleting the document", async () => {
    render(<AgentView />);

    // Verify loading finished
    await waitFor(() => {
      expect(screen.getByText("Toko Makmur")).toBeInTheDocument();
    });

    // Click "Tolak" button
    const rejectBtn = screen.getByRole("button", { name: "Tolak" });
    fireEvent.click(rejectBtn);

    // Verify Firestore deleteDoc is called
    await waitFor(() => {
      expect(mockFirebase.deleteDoc).toHaveBeenCalled();
    });

    // Verify action is removed from DB
    expect(mockFirebase.mockDbStore.agent_actions["demo-001"]).toBeUndefined();
  });
});
