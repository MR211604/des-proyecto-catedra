import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateOpenAPIDocument } from "../../lib/openapi.js";
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

  it("allows only organization admins to read the summary", async () => {
    const adminResponse = await request(testApp()).get("/reports/summary");
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.currency).toBe("USD");

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

  it("documents report-specific filters and the organization admin role", () => {
    const document = generateOpenAPIDocument();
    const orders = document.paths?.["/api/v1/reports/orders"]?.get;

    expect(orders?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "status", in: "query" }),
        expect.objectContaining({ name: "clientId", in: "query" }),
        expect.objectContaining({ name: "overdue", in: "query" }),
      ]),
    );
    expect(orders?.responses?.["403"]).toMatchObject({
      description: "org:admin role required",
    });
  });

  it("returns a downloadable PDF representation", async () => {
    const response = await request(testApp()).get("/reports/orders.pdf");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toContain("orders.pdf");
  });
});
