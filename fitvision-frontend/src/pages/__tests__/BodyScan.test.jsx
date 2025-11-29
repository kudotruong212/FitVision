import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BodyScan from "../BodyScan.jsx";
import * as api from "../../api/client";

vi.mock("../../api/client", () => ({
  fetchScanQuota: vi.fn(),
  analyzeBody: vi.fn(),
  generateWorkoutPlan: vi.fn(),
  saveScanSession: vi.fn(),
}));

vi.mock("../../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    profile: { goal: "Giảm mỡ" },
    profileLoading: false,
  }),
}));

describe("BodyScan quota flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
      writable: true,
    });
  });

  it("renders quota information from API", async () => {
    api.fetchScanQuota.mockResolvedValue({
      allowed: true,
      left: 3,
      max: 5,
    });

    render(<BodyScan />);

    await screen.findByText("Còn 3/5 lượt hôm nay");
    expect(api.fetchScanQuota).toHaveBeenCalled();
  });

  it("prevents analyzing without file", async () => {
    api.fetchScanQuota.mockResolvedValue({
      allowed: true,
      left: 3,
      max: 5,
    });

    render(<BodyScan />);

    await screen.findByText("Còn 3/5 lượt hôm nay");

    fireEvent.click(screen.getByRole("button", { name: /Phân tích cơ thể/i }));

    expect(
      await screen.findByText("Vui lòng chọn một ảnh trước.")
    ).toBeInTheDocument();
    expect(api.analyzeBody).not.toHaveBeenCalled();
  });

  it("disables analyze button when quota is exhausted", async () => {
    api.fetchScanQuota.mockResolvedValue({
      allowed: false,
      left: 0,
      max: 5,
    });

    render(<BodyScan />);

    await screen.findByText("Đã hết lượt hôm nay");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Phân tích cơ thể/i })
      ).toBeDisabled();
    });
  });
});

