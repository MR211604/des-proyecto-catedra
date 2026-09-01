import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errors.js";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  orgRole: "org:member",
  userId: "user_1",
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () => (_request: unknown, _response: unknown, next: () => void) =>
      next(),
  getAuth: () => auth,
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
const {
  createQuote,
  getQuoteById,
  listQuotes,
  updateQuote,
  deleteQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
  convertQuote,
} = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/quotes", quoteRouter);
  app.use(errorHandler);
  return app;
}

describe("Quotes HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("requires an authenticated workshop user", async () => {
    auth.isAuthenticated = false;

    const response = await request(testApp()).get("/quotes");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
    expect(listQuotes).not.toHaveBeenCalled();
  });

  it("allows the privileged role and rejects users without the workshop role", async () => {
    auth.orgRole = "org:admin";
    await expect(request(testApp()).get("/quotes")).resolves.toHaveProperty(
      "status",
      200,
    );

    auth.orgRole = "org:guest";
    const response = await request(testApp()).get("/quotes");

    expect(response.status).toBe(403);
    expect(listQuotes).toHaveBeenCalledOnce();
  });

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

  it("rejects invalid list filters before calling the service", async () => {
    const response = await request(testApp()).get("/quotes?page=0&limit=101");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(listQuotes).not.toHaveBeenCalled();
  });

  it.each([
    ["get", "getQuoteById", () => request(testApp()).get("/quotes/quote_1")],
    [
      "update",
      "updateQuote",
      () =>
        request(testApp())
          .put("/quotes/quote_1")
          .send({
            clientId: "client_1",
            items: [{ description: "Hem", quantity: "1", unitPrice: "10" }],
          }),
    ],
    ["delete", "deleteQuote", () => request(testApp()).delete("/quotes/quote_1")],
  ] as const)("supports the %s CRUD operation", async (_operation, serviceName, makeRequest) => {
    const response = await makeRequest();

    expect(response.status).toBe(200);
    expect(vi.mocked({ getQuoteById, updateQuote, deleteQuote }[serviceName])).toHaveBeenCalledWith(
      ...(serviceName === "updateQuote"
        ? [
            "quote_1",
            {
              clientId: "client_1",
              items: [{ description: "Hem", quantity: "1", unitPrice: "10" }],
            },
            "user_1",
          ]
        : ["quote_1", ...(serviceName === "deleteQuote" ? ["user_1"] : [])]),
    );
  });

  it("passes service errors through the HTTP error contract", async () => {
    vi.mocked(getQuoteById).mockRejectedValueOnce(new Error("database unavailable"));

    const response = await request(testApp()).get("/quotes/quote_1");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
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
