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
  createOrder: vi.fn(async (input) => ({ id: "order_1", ...input })),
  getOrderById: vi.fn(async () => ({ id: "order_1" })),
  listOrders: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  updateOrder: vi.fn(async () => ({ id: "order_1" })),
  deleteOrder: vi.fn(async () => ({ id: "order_1", deleted: true })),
  startOrderProduction: vi.fn(async () => ({
    id: "order_1",
    status: "IN_PRODUCTION",
  })),
  markOrderReady: vi.fn(async () => ({ id: "order_1", status: "READY" })),
  deliverOrder: vi.fn(async () => ({ id: "order_1", status: "DELIVERED" })),
  cancelOrder: vi.fn(async () => ({ id: "order_1", status: "CANCELLED" })),
}));

const { orderRouter } = await import("./router.js");
const service = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/orders", orderRouter);
  app.use(errorHandler);
  return app;
}

const validOrder = {
  clientId: "client_1",
  items: [{ description: "Hem", quantity: "2", unitPrice: "10" }],
  jobs: [{ stageId: "stage_1", description: "Hem", orderItemIndex: 0 }],
};

describe("Orders HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("creates an order with items and production jobs", async () => {
    const response = await request(testApp()).post("/orders").send(validOrder);

    expect(response.status).toBe(201);
    expect(service.createOrder).toHaveBeenCalledWith(validOrder, "user_1");
  });

  it("requires at least one item and one production job", async () => {
    const response = await request(testApp()).post("/orders").send({
      clientId: "client_1",
      items: [],
      jobs: [],
    });

    expect(response.status).toBe(400);
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it("lists orders with validated defaults", async () => {
    const response = await request(testApp()).get("/orders");

    expect(response.status).toBe(200);
    expect(service.listOrders).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      order: "desc",
    });
  });

  it.each([
    ["start", service.startOrderProduction, "IN_PRODUCTION"],
    ["ready", service.markOrderReady, "READY"],
    ["deliver", service.deliverOrder, "DELIVERED"],
    ["cancel", service.cancelOrder, "CANCELLED"],
  ] as const)(
    "supports the %s lifecycle action",
    async (action, operation, status) => {
      const response = await request(testApp()).post(
        `/orders/order_1/${action}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(status);
      expect(operation).toHaveBeenCalledWith("order_1", "user_1");
    },
  );
});
