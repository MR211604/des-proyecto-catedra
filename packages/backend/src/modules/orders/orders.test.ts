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
    expect(service.createOrder).toHaveBeenCalledWith(validOrder);
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

  it("passes a per-item material list to the service on create", async () => {
    const order = {
      ...validOrder,
      items: [
        {
          description: "Hem",
          quantity: "2",
          unitPrice: "10",
          materials: [
            { inventoryItemId: "item_1", quantity: "1.5", unit: "METER" },
          ],
        },
      ],
    };

    const response = await request(testApp()).post("/orders").send(order);

    expect(response.status).toBe(201);
    expect(service.createOrder).toHaveBeenCalledWith(order);
  });

  it("rejects a material with a non-positive quantity", async () => {
    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [
              { inventoryItemId: "item_1", quantity: "0", unit: "METER" },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it("rejects a material whose unit is outside the unit vocabulary", async () => {
    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [
              { inventoryItemId: "item_1", quantity: "1", unit: "BOXES" },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it("rejects a material without an inventory item id", async () => {
    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [{ quantity: "1", unit: "METER" }],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(service.createOrder).not.toHaveBeenCalled();
  });

  it("rejects a material that does not exist or is deactivated with 400", async () => {
    vi.mocked(service.createOrder).mockRejectedValueOnce(
      new AppError(400, "Material not found or deactivated"),
    );

    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [
              { inventoryItemId: "item_missing", quantity: "1", unit: "METER" },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Material not found or deactivated");
  });

  it("rejects a material whose unit differs from the inventory item unit with 400", async () => {
    vi.mocked(service.createOrder).mockRejectedValueOnce(
      new AppError(400, "Material unit does not match the inventory item unit"),
    );

    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [
              { inventoryItemId: "item_1", quantity: "1", unit: "ROLL" },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Material unit does not match the inventory item unit",
    );
  });

  it("rejects duplicate materials within the same order item with 400", async () => {
    vi.mocked(service.createOrder).mockRejectedValueOnce(
      new AppError(400, "Duplicate material within the same order item"),
    );

    const response = await request(testApp())
      .post("/orders")
      .send({
        ...validOrder,
        items: [
          {
            description: "Hem",
            quantity: "2",
            unitPrice: "10",
            materials: [
              { inventoryItemId: "item_1", quantity: "1", unit: "METER" },
              { inventoryItemId: "item_1", quantity: "2", unit: "METER" },
            ],
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Duplicate material within the same order item",
    );
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

  it("surfaces a 409 when starting production fails on material availability", async () => {
    vi.mocked(service.startOrderProduction).mockRejectedValueOnce(
      new AppError(409, "Insufficient stock to start production"),
    );

    const response = await request(testApp()).post("/orders/order_1/start");

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Insufficient stock to start production");
  });
});
