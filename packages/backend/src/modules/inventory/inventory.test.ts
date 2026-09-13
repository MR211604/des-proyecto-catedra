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
  listInventoryItems: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  getInventoryItemById: vi.fn(async () => ({ id: "item_1" })),
  createInventoryItem: vi.fn(async (input) => ({ id: "item_1", ...input })),
  updateInventoryItem: vi.fn(async () => ({ id: "item_1" })),
  deleteInventoryItem: vi.fn(async () => ({ id: "item_1", deletedAt: null })),
  restoreInventoryItem: vi.fn(async () => ({ id: "item_1", deletedAt: null })),
  createStockMovement: vi.fn(async (itemId, input) => ({
    id: "movement_1",
    itemId,
    ...input,
  })),
  listStockMovements: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
}));

const { inventoryRouter } = await import("./router.js");
const {
  listInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restoreInventoryItem,
  createStockMovement,
  listStockMovements,
} = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/inventory", inventoryRouter);
  app.use(errorHandler);
  return app;
}

describe("Inventory HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("requires an authenticated workshop user", async () => {
    auth.isAuthenticated = false;

    const response = await request(testApp()).get("/inventory/items");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
    expect(listInventoryItems).not.toHaveBeenCalled();
  });

  it("allows the privileged role and rejects users without the workshop role", async () => {
    auth.orgRole = "org:admin";
    await expect(
      request(testApp()).get("/inventory/items"),
    ).resolves.toHaveProperty("status", 200);

    auth.orgRole = "org:guest";
    const response = await request(testApp()).get("/inventory/items");

    expect(response.status).toBe(403);
    expect(listInventoryItems).toHaveBeenCalledOnce();
  });

  it("creates a material with the authenticated user as audit actor", async () => {
    const response = await request(testApp()).post("/inventory/items").send({
      name: "Tela de algodón",
      sku: "TEL-001",
      unit: "METER",
      quantity: "10.000",
      reorderPoint: "5.000",
      supplierId: "supplier_1",
    });

    expect(response.status).toBe(201);
    expect(vi.mocked(createInventoryItem)).toHaveBeenCalledWith(
      {
        name: "Tela de algodón",
        sku: "TEL-001",
        unit: "METER",
        quantity: "10.000",
        reorderPoint: "5.000",
        supplierId: "supplier_1",
      },
      "user_1",
    );
    expect(response.body.id).toBe("item_1");
  });

  it("rejects a material without a name or with malformed quantities", async () => {
    const response = await request(testApp()).post("/inventory/items").send({
      unit: "METER",
      quantity: "10.000",
      reorderPoint: "5.000",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(createInventoryItem).not.toHaveBeenCalled();

    const malformed = await request(testApp()).post("/inventory/items").send({
      name: "Cierre metálico",
      unit: "UNIT",
      quantity: "1.0000",
      reorderPoint: "0.000",
    });

    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe("Validation failed");
    expect(createInventoryItem).not.toHaveBeenCalled();
  });

  it("lists materials with validated pagination and filter parameters", async () => {
    const response = await request(testApp()).get(
      "/inventory/items?page=2&limit=5&search=tela&supplierId=supplier_1&unit=METER&sortBy=quantity&order=desc&includeDeleted=true",
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(listInventoryItems)).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: "tela",
      supplierId: "supplier_1",
      unit: "METER",
      sortBy: "quantity",
      order: "desc",
      includeDeleted: true,
    });
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("rejects invalid list filters before calling the service", async () => {
    const response = await request(testApp()).get(
      "/inventory/items?page=0&limit=101&sortBy=stock&unit=BOX",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(listInventoryItems).not.toHaveBeenCalled();
  });

  it.each([
    [
      "get",
      "getInventoryItemById",
      () => request(testApp()).get("/inventory/items/item_1"),
    ],
    [
      "update",
      "updateInventoryItem",
      () =>
        request(testApp())
          .put("/inventory/items/item_1")
          .send({ name: "Tela de algodón premium", reorderPoint: "4.000" }),
    ],
    [
      "delete",
      "deleteInventoryItem",
      () => request(testApp()).delete("/inventory/items/item_1"),
    ],
    [
      "restore",
      "restoreInventoryItem",
      () => request(testApp()).patch("/inventory/items/item_1/restore"),
    ],
  ] as const)(
    "supports the %s material operation",
    async (_operation, serviceName, makeRequest) => {
      const response = await makeRequest();

      expect(response.status).toBe(200);
      expect(
        vi.mocked(
          {
            getInventoryItemById,
            updateInventoryItem,
            deleteInventoryItem,
            restoreInventoryItem,
          }[serviceName],
        ),
      ).toHaveBeenCalledWith(
        ...(serviceName === "updateInventoryItem"
          ? [
              "item_1",
              { name: "Tela de algodón premium", reorderPoint: "4.000" },
              "user_1",
            ]
          : [
              "item_1",
              ...(serviceName === "getInventoryItemById" ? [] : ["user_1"]),
            ]),
      );
    },
  );

  it("rejects an update without any valid field", async () => {
    const response = await request(testApp())
      .put("/inventory/items/item_1")
      .send({ unit: "BOX", reorderPoint: "4.0000" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(updateInventoryItem).not.toHaveBeenCalled();
  });

  it("records a stock movement for an item with the authenticated actor", async () => {
    const response = await request(testApp())
      .post("/inventory/items/item_1/movements")
      .send({
        type: "RECEIPT",
        quantity: "2.500",
        unit: "METER",
        reference: "PO-100",
      });

    expect(response.status).toBe(201);
    expect(vi.mocked(createStockMovement)).toHaveBeenCalledWith(
      "item_1",
      {
        type: "RECEIPT",
        quantity: "2.500",
        unit: "METER",
        reference: "PO-100",
      },
      "user_1",
    );
    expect(response.body.id).toBe("movement_1");
  });

  it("rejects a zero or malformed movement quantity before calling the service", async () => {
    const zero = await request(testApp())
      .post("/inventory/items/item_1/movements")
      .send({ type: "ADJUSTMENT", quantity: "0.000", unit: "METER" });

    expect(zero.status).toBe(400);
    expect(zero.body.error).toBe("Validation failed");

    const malformed = await request(testApp())
      .post("/inventory/items/item_1/movements")
      .send({ type: "ISSUE", quantity: "1.0000", unit: "METER" });

    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe("Validation failed");
    expect(createStockMovement).not.toHaveBeenCalled();
  });

  it("lists movements filtered by type with default descending order", async () => {
    const response = await request(testApp()).get(
      "/inventory/items/item_1/movements?page=1&limit=10&type=ISSUE",
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(listStockMovements)).toHaveBeenCalledWith("item_1", {
      page: 1,
      limit: 10,
      type: "ISSUE",
      order: "desc",
    });
  });

  it("rejects invalid movement filters before calling the service", async () => {
    const response = await request(testApp()).get(
      "/inventory/items/item_1/movements?type=REFUND",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(listStockMovements).not.toHaveBeenCalled();
  });

  it("passes not-found, conflict and validation service errors through the HTTP error contract", async () => {
    vi.mocked(getInventoryItemById).mockRejectedValueOnce(
      new AppError(404, "Item not found"),
    );

    const notFound = await request(testApp()).get("/inventory/items/item_1");

    expect(notFound.status).toBe(404);
    expect(notFound.body.error).toBe("Item not found");

    vi.mocked(createInventoryItem).mockRejectedValueOnce(
      new AppError(409, "Item with this SKU already exists"),
    );

    const conflict = await request(testApp()).post("/inventory/items").send({
      name: "Cierre metálico",
      unit: "UNIT",
      quantity: "10.000",
      reorderPoint: "5.000",
    });

    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toBe("Item with this SKU already exists");

    vi.mocked(createStockMovement).mockRejectedValueOnce(
      new AppError(400, "Movement unit does not match the item unit"),
    );

    const mismatch = await request(testApp())
      .post("/inventory/items/item_1/movements")
      .send({ type: "RECEIPT", quantity: "2.500", unit: "UNIT" });

    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error).toBe(
      "Movement unit does not match the item unit",
    );
  });

  it.each([
    [
      "get",
      getInventoryItemById,
      () => request(testApp()).get("/inventory/items/item_1"),
    ],
    [
      "update",
      updateInventoryItem,
      () =>
        request(testApp()).put("/inventory/items/item_1").send({ name: "X" }),
    ],
    [
      "delete",
      deleteInventoryItem,
      () => request(testApp()).delete("/inventory/items/item_1"),
    ],
    [
      "restore",
      restoreInventoryItem,
      () => request(testApp()).patch("/inventory/items/item_1/restore"),
    ],
    [
      "movement create",
      createStockMovement,
      () =>
        request(testApp())
          .post("/inventory/items/item_1/movements")
          .send({ type: "RECEIPT", quantity: "1.000", unit: "METER" }),
    ],
  ] as const)(
    "returns 404 when the %s target does not exist",
    async (_operation, operation, makeRequest) => {
      vi.mocked(operation).mockRejectedValueOnce(
        new AppError(404, "Item not found"),
      );

      const response = await makeRequest();

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Item not found");
    },
  );

  it("returns 409 when restoring a material that is not deactivated", async () => {
    vi.mocked(restoreInventoryItem).mockRejectedValueOnce(
      new AppError(409, "Item is not deleted"),
    );

    const response = await request(testApp()).patch(
      "/inventory/items/item_1/restore",
    );

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Item is not deleted");
  });

  it("passes unexpected service errors through the HTTP error contract", async () => {
    vi.mocked(getInventoryItemById).mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const response = await request(testApp()).get("/inventory/items/item_1");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
  });
});
