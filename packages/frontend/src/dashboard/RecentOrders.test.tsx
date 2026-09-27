// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../orders/types.ts";
import { RecentOrders } from "./RecentOrders.tsx";

const { useOrders } = vi.hoisted(() => ({ useOrders: vi.fn() }));

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

vi.mock("../orders/api.ts", () => ({ useOrders }));

const deliveredOrder: Order = {
  id: "order-1",
  number: 1,
  client: { name: "Ana Pérez" },
  quote: null,
  status: "DELIVERED",
  notes: null,
  dueDate: "2026-10-01T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-27T18:30:00.000Z",
  deliveredAt: "2026-09-27T18:30:00.000Z",
  items: [{ total: "100.00" }],
};

describe("RecentOrders", () => {
  beforeEach(() => {
    useOrders.mockReturnValue({
      data: {
        data: [deliveredOrder],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isPending: false,
      isError: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the last update for recent orders and the actual delivery date", () => {
    render(
      <MemoryRouter>
        <RecentOrders />
      </MemoryRouter>,
    );

    expect(useOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: "",
      sortBy: "updatedAt",
      order: "desc",
    });
    expect(screen.getByText("Real: 27/09/2026")).toBeTruthy();
    expect(screen.queryByText("Estimada: 01/10/2026")).toBeNull();
  });
});
