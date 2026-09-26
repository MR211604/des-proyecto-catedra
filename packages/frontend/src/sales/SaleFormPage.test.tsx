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
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleFormPage } from "./SaleFormPage.tsx";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

const baseOrder = {
  id: "order-1",
  number: 1,
  client: { name: "Ana Pérez" },
  quote: null,
  notes: null,
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  items: [{ total: "25.00" }],
};

const orderDetail = {
  ...baseOrder,
  client: { id: "client-1", name: "Ana Pérez" },
  status: "CONFIRMED" as const,
  items: [
    {
      id: "item-1",
      description: "Bastilla",
      quantity: "2.500",
      unitPrice: "10.00",
      materials: [],
    },
  ],
  jobs: [],
};

const saleForOrderTwo = {
  id: "sale-2",
  number: 2,
  orderId: "order-2",
  status: "OPEN" as const,
  total: "50.00",
  paidAmount: "0.00",
  outstandingBalance: "50.00",
  payments: [],
  order: { id: "order-2", client: { id: "client-2", name: "Beatriz López" } },
  createdAt: "2026-01-02T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const createdSale = {
  ...saleForOrderTwo,
  id: "sale-1",
  number: 1,
  orderId: "order-1",
  order: { id: "order-1", client: { id: "client-1", name: "Ana Pérez" } },
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
    vi
      .fn()
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url === "/api/v1/sales" && init?.method === "POST") {
            return jsonResponse(createdSale, 201);
          }
          if (url.includes("/sales?")) {
            return jsonResponse({
              data: [saleForOrderTwo],
              meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
            });
          }
          if (url.endsWith("/orders/order-1")) {
            return jsonResponse(orderDetail);
          }
          if (url.includes("/orders?")) {
            return jsonResponse({
              data: [
                { ...baseOrder, status: "CONFIRMED" },
                {
                  ...baseOrder,
                  id: "order-2",
                  number: 2,
                  status: "DELIVERED",
                  client: { name: "Beatriz López" },
                },
                {
                  ...baseOrder,
                  id: "order-3",
                  number: 3,
                  status: "CANCELLED",
                  client: { name: "Carla Ruiz" },
                },
              ],
              meta: { page: 1, limit: 100, total: 3, totalPages: 1 },
            });
          }
          return jsonResponse({});
        },
      ),
  );
}

function renderCreate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/ventas/nueva"]}>
        <Routes>
          <Route path="ventas/nueva" element={<SaleFormPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function LocationProbe() {
  return <output>{useLocation().pathname}</output>;
}

describe("SaleFormPage", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers only orders without a sale and not cancelled", async () => {
    mockApi();
    renderCreate();

    expect(
      await screen.findByRole("option", { name: /ORD-1 · Ana Pérez/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("option", { name: /ORD-2/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /ORD-3/ })).toBeNull();
  });

  it("shows the selected order preview", async () => {
    mockApi();
    renderCreate();
    await screen.findByRole("option", { name: /ORD-1/ });

    fireEvent.change(screen.getByRole("combobox", { name: /Pedido/ }), {
      target: { value: "order-1" },
    });

    expect(await screen.findByText("Bastilla")).toBeTruthy();
    expect(screen.getByText("$10.00")).toBeTruthy();
    expect(screen.getAllByText("$25.00").length).toBeGreaterThanOrEqual(2);
  });

  it("creates the sale with the selected order and navigates back", async () => {
    mockApi();
    renderCreate();
    await screen.findByRole("option", { name: /ORD-1/ });

    fireEvent.change(screen.getByRole("combobox", { name: /Pedido/ }), {
      target: { value: "order-1" },
    });
    await screen.findByText("Bastilla");
    fireEvent.click(screen.getByRole("button", { name: "Guardar venta" }));

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input) === "/api/v1/sales" && init?.method === "POST",
          ),
      ).toBe(true),
    );
    const request = vi
      .mocked(fetch)
      .mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/v1/sales" && init?.method === "POST",
      );
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      orderId: "order-1",
    });

    expect(await screen.findByText("/ventas")).toBeTruthy();
  });

  it("requires selecting an order before saving", async () => {
    mockApi();
    renderCreate();
    await screen.findByRole("option", { name: /ORD-1/ });

    fireEvent.click(screen.getByRole("button", { name: "Guardar venta" }));

    expect(await screen.findByText("Selecciona un pedido.")).toBeTruthy();
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            String(input) === "/api/v1/sales" && init?.method === "POST",
        ),
    ).toBe(false);
  });
});
