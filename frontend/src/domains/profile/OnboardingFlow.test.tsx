import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ProfileView } from "./components/ProfileView";
import { MemoryRouter } from "react-router-dom";

describe("OnboardingFlow Integration Test", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  it("should open setup modal, input setup fields, submit, and call /api/initial-setup", async () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : (url as any).url;
      if (urlStr.includes("/api/initial-setup")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled fetch to ${urlStr}`));
    });

    const mockAlert = vi.fn();
    vi.stubGlobal("alert", mockAlert);

    render(
      <MemoryRouter>
        <ProfileView />
      </MemoryRouter>
    );

    // Open setup modal
    const openModalBtn = screen.getByText("Atur Saldo Awal");
    fireEvent.click(openModalBtn);

    // Verify modal elements are displayed
    expect(screen.getByText("Atur Posisi Keuangan")).toBeInTheDocument();

    // Query form fields by their placeholder text
    const cashInput = screen.getByPlaceholderText("Contoh: 5000000");
    const bankInput = screen.getByPlaceholderText("Contoh: 15000000");
    const inventoryInput = screen.getByPlaceholderText("Contoh: 2000000");
    const receivablesInput = screen.getByPlaceholderText("Contoh: 2500000");

    // Input test values
    fireEvent.change(cashInput, { target: { value: "10000000" } });
    fireEvent.change(bankInput, { target: { value: "25000000" } });
    fireEvent.change(inventoryInput, { target: { value: "3000000" } });
    fireEvent.change(receivablesInput, { target: { value: "1500000" } });

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: "Simpan Saldo" });
    fireEvent.click(submitBtn);

    // Wait for the request to be fired
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const setupCall = mockFetch.mock.calls[0];
    const urlStr = typeof setupCall[0] === "string" ? setupCall[0] : (setupCall[0] as any).url;
    expect(urlStr).toContain("/api/initial-setup");

    const callOptions = setupCall[1] as RequestInit;
    expect(callOptions.method).toBe("POST");

    // Verify form parameters in URLSearchParams body
    const bodyParams = new URLSearchParams(callOptions.body as string);
    expect(bodyParams.get("uid")).toBe("test-user-v050");
    expect(bodyParams.get("cash")).toBe("10000000");
    expect(bodyParams.get("bank")).toBe("25000000");
    expect(bodyParams.get("inventory")).toBe("3000000");
    expect(bodyParams.get("receivables")).toBe("1500000");

    // Verify feedback and modal cleanup
    expect(mockAlert).toHaveBeenCalledWith("Saldo awal berhasil disimpan!");
    expect(screen.queryByText("Atur Posisi Keuangan")).not.toBeInTheDocument();
  });

  it("should open profile modal, input profile fields, submit, and call /api/profile-setup", async () => {
    mockFetch.mockImplementation((url) => {
      const urlStr = typeof url === "string" ? url : (url as any).url;
      if (urlStr.includes("/api/profile-setup")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }
      return Promise.reject(new Error(`Unhandled fetch to ${urlStr}`));
    });

    const mockAlert = vi.fn();
    vi.stubGlobal("alert", mockAlert);

    render(
      <MemoryRouter>
        <ProfileView />
      </MemoryRouter>
    );

    // Open profile modal
    const openProfileBtn = screen.getByText("Pengaturan Akun");
    fireEvent.click(openProfileBtn);

    // Verify modal elements are displayed
    expect(screen.getByText("Pengaturan Akun & Bisnis")).toBeInTheDocument();

    // Query form fields by their placeholder text
    const nameInput = screen.getByPlaceholderText("Contoh: Toko Sejahtera");
    const typeInput = screen.getByPlaceholderText("Contoh: Distributor Sembako & Ritel");
    const locationInput = screen.getByPlaceholderText("Contoh: Bandung, Jawa Barat");
    const employeeInput = screen.getByPlaceholderText("Contoh: 3");
    const focusInput = screen.getByPlaceholderText("Contoh: Perputaran Kas Cepat");

    // Input test values
    fireEvent.change(nameInput, { target: { value: "Toko Baru Kita" } });
    fireEvent.change(typeInput, { target: { value: "Retail & Grosir" } });
    fireEvent.change(locationInput, { target: { value: "Jakarta, Indonesia" } });
    fireEvent.change(employeeInput, { target: { value: "5" } });
    fireEvent.change(focusInput, { target: { value: "Untung Maksimal" } });

    // Submit the form
    const submitBtn = screen.getByRole("button", { name: "Simpan Profil" });
    fireEvent.click(submitBtn);

    // Wait for the request to be fired
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const profileCall = mockFetch.mock.calls[0];
    const urlStr = typeof profileCall[0] === "string" ? profileCall[0] : (profileCall[0] as any).url;
    expect(urlStr).toContain("/api/profile-setup");

    const callOptions = profileCall[1] as RequestInit;
    expect(callOptions.method).toBe("POST");

    // Verify form parameters in URLSearchParams body
    const bodyParams = new URLSearchParams(callOptions.body as string);
    expect(bodyParams.get("uid")).toBe("test-user-v050");
    expect(bodyParams.get("business_name")).toBe("Toko Baru Kita");
    expect(bodyParams.get("business_type")).toBe("Retail & Grosir");
    expect(bodyParams.get("location")).toBe("Jakarta, Indonesia");
    expect(bodyParams.get("employee_count")).toBe("5");
    expect(bodyParams.get("primary_focus")).toBe("Untung Maksimal");

    // Verify feedback and modal cleanup
    expect(mockAlert).toHaveBeenCalledWith("Profil bisnis berhasil disimpan!");
    expect(screen.queryByText("Pengaturan Akun & Bisnis")).not.toBeInTheDocument();
  });
});
