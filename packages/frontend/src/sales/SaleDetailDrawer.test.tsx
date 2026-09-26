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
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleDetailDrawer } from "./SaleDetailDrawer.tsx";
import type { SaleDetail } from "./types.ts";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

const paymentOne = {
  id: "payment-1",
  saleId: "sale-1",
  method: "CASH" as const,
  amount: "40.00",
  paidAt: "2026-01-02T10:00:00.000Z",
  reference: "Recibo 1",
  actorId: "user_1",
};

function buildSale(overrides: Partial<SaleDetail> = {}): SaleDetail {
  return {
    id: "sale-1",
    number: 1,
    orderId: "order-1",
    status: "OPEN",
    subtotal: "100.00",
    total: "100.00",
    paidAmount: "40.00",
    outstandingBalance: "60.00",
    items: [
      {
        id: "item-1",
        saleId: "sale-1",
        description: "Bastilla",
        quantity: "1.000",
        unitPrice: "100.00",
        total: "100.00",
      },
    ],
    payments: [paymentOne],
    order: { id: "order-1", client: { id: "client-1", name: "Ana Pérez" } },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockApi(sale: SaleDetail = buildSale()) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          const method = init?.method ?? "GET";
          if (url.includes("/payments/payment-1") && method !== "GET") {
            return jsonResponse({ payment: paymentOne, sale });
          }
          if (url.endsWith("/sales/sale-1/payments") && method === "POST") {
            return jsonResponse({ payment: paymentOne, sale }, 201);
          }
          if (url.includes("/sales/sale-1/payments?")) {
            return jsonResponse({
              data: [paymentOne],
              meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
            });
          }
          if (url.endsWith("/sales/sale-1")) {
            return jsonResponse(sale);
          }
          return jsonResponse({});
        },
      ),
  );
}

function renderDrawer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SaleDetailDrawer saleId="sale-1" onClose={() => {}} />
      <Toaster />
    </QueryClientProvider>,
  );
}

function mutationCall(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.find(([, init]) => init?.method === method);
}

function submitPaymentForm(name: string | RegExp) {
  const form = screen.getByRole("button", { name }).closest("form");
  if (!form) throw new Error("Payment form was not rendered");
  fireEvent.submit(form);
}

describe("SaleDetailDrawer", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the sale summary and payment history", async () => {
    mockApi();
    renderDrawer();

    expect(await screen.findByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText("$100.00")).toBeTruthy();
    expect(screen.getByText("$60.00")).toBeTruthy();
    expect(screen.getAllByText("$40.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Recibo 1/)).toBeTruthy();
    expect(screen.getAllByText("Efectivo").length).toBeGreaterThanOrEqual(1);
  });

  it("registers a payment prefilled with the outstanding balance", async () => {
    mockApi();
    renderDrawer();

    const amount = await screen.findByLabelText(/Monto/);
    expect((amount as HTMLInputElement).value).toBe("60.00");

    fireEvent.change(amount, { target: { value: "20.00" } });
    fireEvent.change(screen.getByLabelText(/Referencia/), {
      target: { value: "Recibo 2" },
    });
    submitPaymentForm("Registrar pago");

    await waitFor(() => expect(mutationCall("POST")).toBeTruthy());
    const request = mutationCall("POST");
    expect(String(request?.[0])).toBe("/api/v1/sales/sale-1/payments");
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      amount: "20.00",
      method: "CASH",
      reference: "Recibo 2",
    });
  });

  it("edits an existing payment reusing the form", async () => {
    mockApi();
    renderDrawer();

    fireEvent.click(
      await screen.findByRole("button", { name: /Editar pago de/ }),
    );
    expect(await screen.findByText("Editar pago")).toBeTruthy();

    const amount = screen.getByLabelText(/Monto/);
    expect((amount as HTMLInputElement).value).toBe("40.00");
    fireEvent.change(amount, { target: { value: "30.00" } });
    submitPaymentForm("Guardar cambios");

    await waitFor(() => expect(mutationCall("PUT")).toBeTruthy());
    const request = mutationCall("PUT");
    expect(String(request?.[0])).toBe(
      "/api/v1/sales/sale-1/payments/payment-1",
    );
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      amount: "30.00",
      method: "CASH",
      reference: "Recibo 1",
    });
  });

  it("deletes a payment after confirmation", async () => {
    mockApi();
    renderDrawer();

    fireEvent.click(
      await screen.findByRole("button", { name: /Eliminar pago de/ }),
    );
    expect(await screen.findByText("¿Eliminar pago?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mutationCall("DELETE")).toBeTruthy());
    expect(String(mutationCall("DELETE")?.[0])).toBe(
      "/api/v1/sales/sale-1/payments/payment-1",
    );
  });

  it("shows a voided sale in read-only mode", async () => {
    mockApi(buildSale({ status: "VOIDED" }));
    renderDrawer();

    expect(await screen.findByText(/Esta venta está anulada/)).toBeTruthy();
    expect(screen.queryByText("Registrar pago")).toBeNull();
    expect(screen.queryByRole("button", { name: /Editar pago de/ })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Eliminar pago de/ }),
    ).toBeNull();
  });
});
