// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Toaster } from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SalesPage } from "./SalesPage.tsx";
import type { Sale, SaleDetail } from "./types.ts";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

const sale: Sale = {
  id: "sale-1",
  number: 1,
  orderId: "order-1",
  status: "OPEN",
  total: "100.00",
  paidAmount: "0.00",
  outstandingBalance: "100.00",
  payments: [],
  order: { id: "order-1", client: { id: "client-1", name: "Ana Pérez" } },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const saleDetail: SaleDetail = {
  ...sale,
  subtotal: "100.00",
  items: [],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/sales/sale-1/payments?")) {
        return jsonResponse({
          data: [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
        });
      }
      if (url.includes("/sales/sale-1/void")) {
        return jsonResponse({ ...sale, status: "VOIDED" });
      }
      if (url.endsWith("/sales/sale-1")) {
        return jsonResponse(saleDetail);
      }
      if (url.includes("/api/v1/sales?")) {
        return jsonResponse({
          data: [sale],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      }
      return jsonResponse({});
    }),
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/ventas"]}>
        <SalesPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SalesPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the sale detail drawer", async () => {
    mockApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Ver venta ORD-1" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Detalle de la venta" }),
    ).toBeTruthy();
  });

  it("voids a sale after confirmation", async () => {
    mockApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Anular venta ORD-1" }),
    );
    expect(await screen.findByText("¿Anular venta?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anular venta" }));

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input) === "/api/v1/sales/sale-1/void" &&
              init?.method === "POST",
          ),
      ).toBe(true),
    );
  });
});
