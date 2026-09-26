// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteFormPage } from "./QuoteFormPage.tsx";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

const client = {
  id: "client-1",
  name: "Ana Pérez",
  phone: null,
  email: null,
  notes: null,
  measurements: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

const inventoryItem = {
  id: "material-1",
  name: "Tela de algodón",
  sku: "TEL-001",
  unit: "METER" as const,
  quantity: "10.000",
  reorderPoint: "2.000",
  supplierId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
};

const quote = {
  id: "quote-1",
  number: 7,
  client: { id: client.id, name: client.name },
  status: "DRAFT" as const,
  notes: "Vestido para gala",
  total: "25.00",
  validUntil: "2026-12-31T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  items: [
    {
      id: "quote-item-1",
      description: "Bastilla",
      quantity: "2.500",
      unitPrice: "10.00",
      total: "25.00",
      specifications: null,
      materials: [
        {
          id: "quote-material-1",
          inventoryItemId: inventoryItem.id,
          quantity: "1.500",
          unit: "METER" as const,
          inventoryItem,
        },
      ],
    },
  ],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockApi({
  includeQuote = false,
  quoteStatus = "DRAFT" as "DRAFT" | "SENT",
} = {}) {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (url.includes("/clients?")) {
            return jsonResponse({ data: [client] });
          }
          if (url.includes("/inventory/items?")) {
            return jsonResponse({ data: [inventoryItem] });
          }
          if (includeQuote && url.endsWith("/quotes/quote-1")) {
            return jsonResponse({ ...quote, status: quoteStatus });
          }
          if (init?.method === "POST" && url === "/api/v1/quotes") {
            return jsonResponse(quote, 201);
          }
          if (init?.method === "PUT" && url.endsWith("/quotes/quote-1")) {
            return jsonResponse(quote);
          }
          return jsonResponse({});
        },
      ),
  );
}

function LocationProbe() {
  return <output>{useLocation().pathname}</output>;
}

function renderCreate() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/cotizaciones/nueva"]}>
        <Routes>
          <Route path="cotizaciones/nueva" element={<QuoteFormPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderEdit() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/cotizaciones/quote-1/editar"]}>
        <Routes>
          <Route path="cotizaciones/:id/editar" element={<QuoteFormPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function submitQuoteForm() {
  const form = screen
    .getByRole("button", { name: /Guardar (cambios|cotización)/ })
    .closest("form");
  if (!form) throw new Error("Quote form was not rendered");
  fireEvent.submit(form);
}

describe("QuoteFormPage", () => {
  beforeEach(() => mockApi());

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("validates required fields before sending a create request", async () => {
    renderCreate();
    await screen.findByRole("option", { name: client.name });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Guardar cotización",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );

    submitQuoteForm();

    expect((await screen.findAllByText("Selecciona un cliente.")).length).toBe(
      2,
    );
    expect(
      screen.getAllByText("El concepto 1 necesita una descripción."),
    ).toHaveLength(2);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(
          ([input, init]) =>
            String(input) === "/api/v1/quotes" && init?.method === "POST",
        ),
    ).toBe(false);
  });

  it("creates a draft quote and returns to the quote list", async () => {
    renderCreate();
    await screen.findByRole("option", { name: client.name });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Guardar cotización",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );

    fireEvent.change(screen.getByLabelText(/Cliente/), {
      target: { value: client.id },
    });
    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: "Bastilla" },
    });
    fireEvent.change(screen.getByLabelText(/^Cantidad/), {
      target: { value: "2.5" },
    });
    fireEvent.change(screen.getByLabelText(/Precio unitario/), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Válida hasta (opcional)"), {
      target: { value: "2026-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar material" }));
    const materialSelect = await screen.findByRole("combobox", {
      name: "Material",
    });
    fireEvent.change(materialSelect, {
      target: { value: inventoryItem.id },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Cantidad \(metros\)/ }),
      {
        target: { value: "1.5" },
      },
    );
    submitQuoteForm();

    await waitFor(() => expect(screen.getByText("/cotizaciones")).toBeTruthy());
    const request = vi
      .mocked(fetch)
      .mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/v1/quotes" && init?.method === "POST",
      );
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      clientId: client.id,
      validUntil: "2026-12-31",
      items: [
        {
          description: "Bastilla",
          quantity: "2.5",
          unitPrice: "10",
          materials: [
            {
              inventoryItemId: inventoryItem.id,
              quantity: "1.5",
              unit: inventoryItem.unit,
            },
          ],
        },
      ],
    });
  });

  it("loads editable quote values for a draft", async () => {
    mockApi({ includeQuote: true });
    renderEdit();

    expect(await screen.findByDisplayValue("Vestido para gala")).toBeTruthy();
    expect(screen.getByDisplayValue("Bastilla")).toBeTruthy();
    expect(screen.getByDisplayValue("2.500")).toBeTruthy();
    expect(screen.getByDisplayValue("10.00")).toBeTruthy();
    expect(screen.getByDisplayValue("2026-12-31")).toBeTruthy();
    await waitFor(() =>
      expect(
        (
          screen.getByRole("combobox", {
            name: "Cliente *",
          }) as HTMLSelectElement
        ).value,
      ).toBe(client.id),
    );
  });

  it("updates a draft through the quote HTTP contract", async () => {
    mockApi({ includeQuote: true });
    renderEdit();
    await screen.findByDisplayValue("Bastilla");
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Guardar cambios",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );

    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: { value: "Bastilla reforzada" },
    });
    submitQuoteForm();

    await waitFor(() => expect(screen.getByText("/cotizaciones")).toBeTruthy());
    const request = vi
      .mocked(fetch)
      .mock.calls.find(
        ([input, init]) =>
          String(input) === "/api/v1/quotes/quote-1" && init?.method === "PUT",
      );
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      clientId: client.id,
      items: [{ description: "Bastilla reforzada" }],
    });
  });

  it("does not render the editor for a non-draft quote", async () => {
    mockApi({ includeQuote: true, quoteStatus: "SENT" });
    renderEdit();

    expect(
      await screen.findByText("Esta cotización ya no es un borrador."),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Guardar cambios" }),
    ).toBeNull();
  });
});
