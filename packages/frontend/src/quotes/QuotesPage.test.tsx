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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QuotesPage } from "./QuotesPage.tsx";
import { formatQuoteDate, formatQuoteTotal } from "./formatters.ts";
import type { QuotesResponse } from "./types.ts";

vi.mock("@clerk/react", () => ({
  useAuth: () => ({ getToken: async () => "test-token" }),
}));

const response: QuotesResponse = {
  data: [
    {
      id: "quote-12",
      number: 12,
      client: { name: "Ana Pérez" },
      status: "DRAFT",
      notes: null,
      total: "1234.5",
      validUntil: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "quote-13",
      number: 13,
      client: { name: "Beatriz López" },
      status: "ACCEPTED",
      notes: "Vestido de gala",
      total: "2500.00",
      validUntil: "2026-12-31T00:00:00.000Z",
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

function renderPage(initialEntry = "/cotizaciones") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <QuotesPage />
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockResponse(body: QuotesResponse, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrls() {
  return vi.mocked(fetch).mock.calls.map(([input]) => String(input));
}

describe("QuotesPage", () => {
  beforeEach(() => {
    mockResponse(response);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders quote fields, Spanish statuses, placeholders, totals, and dates", async () => {
    renderPage();

    expect(screen.getByText("Consultando cotizaciones...")).toBeTruthy();
    expect(await screen.findByText("COT-12")).toBeTruthy();
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText("Beatriz López")).toBeTruthy();
    expect(screen.getByText("Borrador")).toBeTruthy();
    expect(screen.getByText("Aceptada")).toBeTruthy();
    for (const label of [
      "Todos",
      "Borradores",
      "Enviadas",
      "Aceptadas",
      "Rechazadas",
      "Vencidas",
    ]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
    }
    expect(screen.getByText("Vestido de gala")).toBeTruthy();
    expect(
      screen.getByText((text) =>
        text.includes(formatQuoteTotal("1234.5").slice(2)),
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(formatQuoteDate(response.data[1].validUntil)),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeTruthy();
  });

  it("filters and debounces search through the quote HTTP contract", async () => {
    renderPage();
    await screen.findByText("COT-12");

    for (const [label, value] of [
      ["Borradores", "DRAFT"],
      ["Enviadas", "SENT"],
      ["Aceptadas", "ACCEPTED"],
      ["Rechazadas", "REJECTED"],
      ["Vencidas", "EXPIRED"],
    ]) {
      fireEvent.click(screen.getByRole("tab", { name: label }));
      await waitFor(() => {
        expect(
          requestUrls().some((url) => url.includes(`status=${value}`)),
        ).toBe(true);
      });
    }

    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar cotizaciones" }),
      {
        target: { value: "vestido" },
      },
    );
    await waitFor(
      () => {
        expect(
          requestUrls().some(
            (url) => url.includes("search=vestido") && url.includes("page=1"),
          ),
        ).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it("sorts and paginates with URL parameters", async () => {
    mockResponse({
      ...response,
      meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(screen.getByRole("button", { name: /Código/ }));
    await waitFor(() => {
      expect(
        requestUrls().some(
          (url) => url.includes("sortBy=number") && url.includes("order=asc"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: /Creación/ }));
    await waitFor(() => {
      expect(
        requestUrls().some(
          (url) =>
            url.includes("sortBy=createdAt") && url.includes("order=asc"),
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => {
      expect(requestUrls().some((url) => url.includes("page=2"))).toBe(true);
    });
  });

  it("shows empty and recoverable error states", async () => {
    mockResponse({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderPage();
    expect(
      await screen.findByText("No hay cotizaciones para mostrar"),
    ).toBeTruthy();

    cleanup();
    mockResponse(response, 500);
    renderPage();
    expect(
      await screen.findByText("No pudimos cargar las cotizaciones."),
    ).toBeTruthy();

    mockResponse(response);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("COT-12")).toBeTruthy();
  });

  it("shows lifecycle actions according to the quote status", async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 2)
      .toISOString()
      .slice(0, 10);
    mockResponse({
      ...response,
      data: [
        { ...response.data[0], validUntil: `${futureDate}T00:00:00.000Z` },
        { ...response.data[1], status: "SENT" },
        { ...response.data[1], id: "quote-14", number: 14, status: "REJECTED" },
      ],
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
    });
    renderPage();

    await screen.findByText("COT-12");
    expect(
      screen.getByRole("button", { name: /Editar cotización/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Enviar cotización/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Eliminar cotización/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Aceptar cotización/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Rechazar cotización/ }),
    ).toBeTruthy();
    expect(screen.getAllByTitle("Sin acciones disponibles")).toHaveLength(1);
  });

  it("requires confirmation and calls the lifecycle HTTP endpoints", async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 2)
      .toISOString()
      .slice(0, 10);
    mockResponse({
      ...response,
      data: [
        { ...response.data[0], validUntil: `${futureDate}T00:00:00.000Z` },
        { ...response.data[1], status: "SENT" },
      ],
    });
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(screen.getByRole("button", { name: /Enviar cotización/ }));
    expect(await screen.findByText("¿Enviar cotización?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(
      requestUrls().some((url) => url.endsWith("/quotes/quote-12/send")),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Enviar cotización/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));
    await waitFor(() =>
      expect(
        requestUrls().some((url) => url.endsWith("/quotes/quote-12/send")),
      ).toBe(true),
    );
    const sendRequest = vi
      .mocked(fetch)
      .mock.calls.find(
        ([input, init]) =>
          String(input).endsWith("/quotes/quote-12/send") &&
          init?.method === "POST",
      );
    expect(JSON.parse(String(sendRequest?.[1]?.body))).toEqual({});
    expect(await screen.findByText("Cotización enviada.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Aceptar cotización/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Aceptar" }));
    await waitFor(() =>
      expect(
        requestUrls().some((url) => url.endsWith("/quotes/quote-13/accept")),
      ).toBe(true),
    );
    const acceptRequest = vi
      .mocked(fetch)
      .mock.calls.find(
        ([input, init]) =>
          String(input).endsWith("/quotes/quote-13/accept") &&
          init?.method === "POST",
      );
    expect(JSON.parse(String(acceptRequest?.[1]?.body))).toEqual({});
  });

  it("does not send a draft without a future validity date", async () => {
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(screen.getByRole("button", { name: /Enviar cotización/ }));

    expect(
      await screen.findByText(
        "Define una fecha de validez futura antes de enviar la cotización.",
      ),
    ).toBeTruthy();
    expect(
      requestUrls().some((url) => url.endsWith("/quotes/quote-12/send")),
    ).toBe(false);
  });

  it("rejects sent quotes and deletes drafts after confirmation", async () => {
    mockResponse({
      ...response,
      data: [response.data[0], { ...response.data[1], status: "SENT" }],
    });
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(
      screen.getByRole("button", { name: /Rechazar cotización/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    await waitFor(() =>
      expect(
        requestUrls().some((url) => url.endsWith("/quotes/quote-13/reject")),
      ).toBe(true),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Eliminar cotización/ }),
    );
    expect(
      await screen.findByText("COT-12 se eliminará definitivamente."),
    ).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Eliminar" }));
    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(
            ([input, init]) =>
              String(input).endsWith("/quotes/quote-12") &&
              init?.method === "DELETE",
          ),
      ).toBe(true),
    );
  });

  it("shows the API error after a failed lifecycle action", async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 2)
      .toISOString()
      .slice(0, 10);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === "POST") {
              return jsonResponse(
                { error: "La cotización cambió de estado." },
                409,
              );
            }
            return jsonResponse({
              ...response,
              data: [
                {
                  ...response.data[0],
                  validUntil: `${futureDate}T00:00:00.000Z`,
                },
              ],
              meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
            });
          },
        ),
    );
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(screen.getByRole("button", { name: /Enviar cotización/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

    expect(
      await screen.findByText("La cotización cambió de estado."),
    ).toBeTruthy();
  });

  it("refreshes the list after a successful lifecycle mutation", async () => {
    const futureDate = new Date(Date.now() + 86_400_000 * 2)
      .toISOString()
      .slice(0, 10);
    let status: "DRAFT" | "SENT" = "DRAFT";
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(
          async (_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === "POST") {
              status = "SENT";
              return jsonResponse({ ...response.data[0], status });
            }
            return jsonResponse({
              ...response,
              data: [
                {
                  ...response.data[0],
                  status,
                  validUntil: `${futureDate}T00:00:00.000Z`,
                },
              ],
              meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
            });
          },
        ),
    );
    renderPage();
    await screen.findByText("COT-12");

    fireEvent.click(screen.getByRole("button", { name: /Enviar cotización/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Enviada")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Enviar cotización/ }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /Aceptar cotización/ }),
    ).toBeTruthy();
  });
});
