import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errors.js";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  orgRole: "org:admin",
  userId: "owner_1",
}));

vi.mock("@clerk/express", () => ({
  getAuth: () => auth,
  clerkMiddleware:
    () => (_request: unknown, _response: unknown, next: () => void) =>
      next(),
}));

vi.mock("./service.js", () => ({
  summary: vi.fn(async () => ({ period: {}, currency: "USD", data: {} })),
  ordersReport: vi.fn(async () => ({
    period: {},
    summary: {},
    groups: [],
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  productionReport: vi.fn(),
  salesReport: vi.fn(),
  paymentsReport: vi.fn(),
  inventoryReport: vi.fn(),
  clientsReport: vi.fn(),
  quotesReport: vi.fn(),
}));

const { reportsRouter } = await import("./router.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/reports", reportsRouter);
  app.use(errorHandler);
  return app;
}

describe("reports HTTP contract", () => {
  beforeEach(() => {
    auth.isAuthenticated = true;
    auth.orgRole = "org:admin";
  });

  it("allows only workshop owners to read the summary", async () => {
    const ownerResponse = await request(testApp()).get("/reports/summary");
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.currency).toBe("USD");

    auth.orgRole = "org:member";
    const staffResponse = await request(testApp()).get("/reports/summary");
    expect(staffResponse.status).toBe(403);
  });

  it("validates report date ranges before querying", async () => {
    const response = await request(testApp()).get(
      "/reports/orders?from=2026-09-24",
    );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  it("returns a downloadable PDF representation", async () => {
    const response = await request(testApp()).get("/reports/orders.pdf");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("orders.pdf");
  });
});
