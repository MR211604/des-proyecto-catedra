import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errors.js";

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () => (_request: unknown, _response: unknown, next: () => void) =>
      next(),
  getAuth: () => ({
    isAuthenticated: true,
    orgRole: "org:member",
    userId: "user_1",
  }),
}));

vi.mock("./service.js", () => ({
  createQuote: vi.fn(async (input) => ({
    id: "quote_1",
    number: 1,
    status: "DRAFT",
    clientId: input.clientId,
    subtotal: "25.00",
    total: "25.00",
    items: [{ ...input.items[0], total: "25.00" }],
  })),
  getQuoteById: vi.fn(async () => ({ id: "quote_1" })),
  listQuotes: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  updateQuote: vi.fn(async () => ({ id: "quote_1" })),
  deleteQuote: vi.fn(async () => ({ id: "quote_1", deleted: true })),
  sendQuote: vi.fn(async () => ({ id: "quote_1", status: "SENT" })),
  acceptQuote: vi.fn(async () => ({ id: "quote_1", status: "ACCEPTED" })),
  rejectQuote: vi.fn(async () => ({ id: "quote_1", status: "REJECTED" })),
  convertQuote: vi.fn(async () => ({ id: "order_1", status: "CONFIRMED" })),
}));

const { quoteRouter } = await import("./router.js");
const { createQuote, listQuotes, sendQuote, acceptQuote, rejectQuote, convertQuote } =
  await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/quotes", quoteRouter);
  app.use(errorHandler);
  return app;
}

describe("Quotes HTTP contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a draft quote and ignores client-supplied calculated amounts", async () => {
    const response = await request(testApp())
      .post("/quotes")
      .send({
        clientId: "client_1",
        subtotal: "999999.99",
        total: "999999.99",
        items: [
          {
            description: "Hem",
            quantity: "2.5",
            unitPrice: "10.00",
            total: "1.00",
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.total).toBe("25.00");
    expect(vi.mocked(createQuote)).toHaveBeenCalledWith(
      {
        clientId: "client_1",
        items: [{ description: "Hem", quantity: "2.5", unitPrice: "10.00" }],
      },
      "user_1",
    );
  });

  it("rejects a quote without items or with invalid decimal values", async () => {
    const response = await request(testApp())
      .post("/quotes")
      .send({
        clientId: "client_1",
        items: [{ description: "Hem", quantity: "0", unitPrice: "10.001" }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(createQuote).not.toHaveBeenCalled();
  });

  it("lists quotes with validated pagination parameters", async () => {
    const response = await request(testApp()).get(
      "/quotes?page=2&limit=5&status=DRAFT",
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(listQuotes)).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      status: "DRAFT",
      sortBy: "createdAt",
      order: "desc",
    });
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it.each([
    ["send", sendQuote, "SENT"],
    ["accept", acceptQuote, "ACCEPTED"],
    ["reject", rejectQuote, "REJECTED"],
    ["convert", convertQuote, "CONFIRMED"],
  ] as const)("supports the %s lifecycle action", async (action, operation, status) => {
    const response = await request(testApp()).post(`/quotes/quote_1/${action}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe(status);
    expect(operation).toHaveBeenCalledWith("quote_1", "user_1");
  });
});
