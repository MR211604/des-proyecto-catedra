import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, errorHandler } from "../../middleware/errors.js";

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
  createSale: vi.fn(async () => ({ id: "sale_1", status: "OPEN" })),
  getSaleById: vi.fn(async () => ({ id: "sale_1" })),
  listSales: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  voidSale: vi.fn(async () => ({ id: "sale_1", status: "VOIDED" })),
  listPayments: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  createPayment: vi.fn(async () => ({
    payment: { id: "payment_1", amount: "10.00" },
    sale: { id: "sale_1", outstandingBalance: "10.00" },
  })),
  updatePayment: vi.fn(async () => ({
    payment: { id: "payment_1", amount: "10.00" },
    sale: { id: "sale_1", outstandingBalance: "10.00" },
  })),
  deletePayment: vi.fn(async () => ({
    payment: { id: "payment_1" },
    sale: { id: "sale_1", outstandingBalance: "10.00" },
  })),
}));

const { saleRouter } = await import("./router.js");
const service = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/sales", saleRouter);
  app.use(errorHandler);
  return app;
}

describe("Sales HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("requires an authenticated workshop user", async () => {
    auth.isAuthenticated = false;

    const response = await request(testApp()).get("/sales");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
    expect(service.listSales).not.toHaveBeenCalled();
  });

  it("allows the admin role and rejects unknown roles", async () => {
    auth.orgRole = "org:admin";
    expect((await request(testApp()).get("/sales")).status).toBe(200);

    auth.orgRole = "org:guest";
    const response = await request(testApp()).get("/sales");

    expect(response.status).toBe(403);
  });

  it("creates a sale from an order", async () => {
    const response = await request(testApp())
      .post("/sales")
      .send({ orderId: "order_1" });

    expect(response.status).toBe(201);
    expect(service.createSale).toHaveBeenCalledWith({ orderId: "order_1" });
  });

  it("validates the sale creation body", async () => {
    const response = await request(testApp()).post("/sales").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(service.createSale).not.toHaveBeenCalled();
  });

  it("voids a sale and passes payment actor identity", async () => {
    const voidResponse = await request(testApp()).post("/sales/sale_1/void");
    expect(voidResponse.status).toBe(200);
    expect(service.voidSale).toHaveBeenCalledWith("sale_1");

    const paymentResponse = await request(testApp())
      .post("/sales/sale_1/payments")
      .send({ amount: "10.00", method: "CASH" });

    expect(paymentResponse.status).toBe(201);
    expect(service.createPayment).toHaveBeenCalledWith(
      "sale_1",
      { amount: "10.00", method: "CASH" },
      "user_1",
    );
  });

  it("validates payment amounts and methods", async () => {
    const response = await request(testApp())
      .post("/sales/sale_1/payments")
      .send({ amount: "0", method: "CARD" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(service.createPayment).not.toHaveBeenCalled();
  });

  it("maps domain conflicts through the standard error contract", async () => {
    vi.mocked(service.voidSale).mockRejectedValueOnce(
      new AppError(409, "Sale is already voided"),
    );

    const response = await request(testApp()).post("/sales/sale_1/void");

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Sale is already voided");
  });
});
