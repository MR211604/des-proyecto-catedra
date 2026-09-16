import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const {
  transaction,
  supplierFindFirst,
  itemFindFirst,
  itemFindUnique,
  itemFindMany,
  itemCount,
  itemCreate,
  itemUpdate,
  movementCreate,
  movementFindMany,
  movementCount,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  supplierFindFirst: vi.fn(),
  itemFindFirst: vi.fn(),
  itemFindUnique: vi.fn(),
  itemFindMany: vi.fn(),
  itemCount: vi.fn(),
  itemCreate: vi.fn(),
  itemUpdate: vi.fn(),
  movementCreate: vi.fn(),
  movementFindMany: vi.fn(),
  movementCount: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    supplier: { findFirst: supplierFindFirst },
    inventoryItem: {
      findFirst: itemFindFirst,
      findUnique: itemFindUnique,
      findMany: itemFindMany,
      count: itemCount,
      create: itemCreate,
      update: itemUpdate,
    },
    stockMovement: {
      create: movementCreate,
      findMany: movementFindMany,
      count: movementCount,
    },
  },
}));

const {
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restoreInventoryItem,
  createStockMovement,
  listStockMovements,
} = await import("./service.js");

const item = {
  id: "item_1",
  name: "Tela de algodón",
  sku: "TEL-001",
  unit: "METER",
  quantity: new Prisma.Decimal("10.000"),
  reorderPoint: new Prisma.Decimal("5.000"),
  supplierId: "supplier_1",
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  deletedAt: null,
};

const movement = {
  id: "movement_1",
  itemId: "item_1",
  orderItemId: null,
  type: "RECEIPT",
  quantity: new Prisma.Decimal("2.500"),
  unit: "METER",
  reference: "PO-100",
  reason: null,
  createdAt: new Date("2026-09-02T00:00:00.000Z"),
};

const issuedMovement = {
  ...movement,
  orderItemId: "order_item_1",
  type: "ISSUE",
  reason: "production",
  orderItem: {
    id: "order_item_1",
    orderId: "order_1",
    description: "Hem",
    quantity: new Prisma.Decimal("2.000"),
    unitPrice: new Prisma.Decimal("10.00"),
    total: new Prisma.Decimal("20.00"),
    specifications: null,
  },
};

const tx = {
  supplier: { findFirst: supplierFindFirst },
  inventoryItem: {
    findFirst: itemFindFirst,
    findUnique: itemFindUnique,
    update: itemUpdate,
    create: itemCreate,
  },
  stockMovement: { create: movementCreate },
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );
  supplierFindFirst.mockResolvedValue({ id: "supplier_1" });
  itemFindFirst.mockResolvedValue(item);
  itemFindUnique.mockResolvedValue(item);
  itemCreate.mockResolvedValue(item);
  itemUpdate.mockImplementation(
    async (_args: unknown, ..._rest: unknown[]) => item,
  );
  movementCreate.mockResolvedValue(movement);
});

describe("inventory service persistence boundary", () => {
  it("parses item decimals and serializes exact string values", async () => {
    await expect(
      createInventoryItem({
        name: "Tela de algodón",
        sku: "TEL-001",
        unit: "METER",
        quantity: "10.000",
        reorderPoint: "5.000",
        supplierId: "supplier_1",
      }),
    ).resolves.toMatchObject({
      id: "item_1",
      quantity: "10",
      reorderPoint: "5",
    });

    const createCall = itemCreate.mock.calls[0]?.[0];
    expect(createCall.data.quantity).toEqual(new Prisma.Decimal("10.000"));
    expect(createCall.data.reorderPoint).toEqual(new Prisma.Decimal("5.000"));
    expect(createCall.data.sku).toBe("TEL-001");
  });

  it("rejects a create when the supplier does not exist or is deactivated", async () => {
    supplierFindFirst.mockResolvedValue(null);

    await expect(
      createInventoryItem({
        name: "Tela de algodón",
        unit: "METER",
        quantity: "10.000",
        reorderPoint: "5.000",
        supplierId: "supplier_missing",
      }),
    ).rejects.toEqual(new AppError(400, "Supplier not found or deactivated"));
    expect(itemCreate).not.toHaveBeenCalled();
  });

  it("allows a create without a supplier", async () => {
    supplierFindFirst.mockResolvedValue(null);

    await expect(
      createInventoryItem({
        name: "Tela de algodón",
        unit: "METER",
        quantity: "10.000",
        reorderPoint: "5.000",
      }),
    ).resolves.toMatchObject({ id: "item_1" });

    const createCall = itemCreate.mock.calls[0]?.[0];
    expect(createCall.data.supplierId).toBeNull();
    expect(supplierFindFirst).not.toHaveBeenCalled();
  });

  it("maps duplicate SKU conflicts to an HTTP conflict", async () => {
    itemCreate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      createInventoryItem({
        name: "Tela de algodón",
        sku: "TEL-001",
        unit: "METER",
        quantity: "10.000",
        reorderPoint: "5.000",
      }),
    ).rejects.toEqual(new AppError(409, "Item with this SKU already exists"));
  });

  it("updates an item without touching its current quantity", async () => {
    await expect(
      updateInventoryItem("item_1", {
        name: "Tela premium",
        reorderPoint: "4.000",
        sku: "TEL-002",
      }),
    ).resolves.toMatchObject({ id: "item_1" });

    const updateCall = itemUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.quantity).toBeUndefined();
    expect(updateCall.data.reorderPoint).toEqual(new Prisma.Decimal("4.000"));
  });

  it("re-validates the supplier when an update changes it", async () => {
    supplierFindFirst.mockResolvedValue(null);

    await expect(
      updateInventoryItem("item_1", { supplierId: "supplier_missing" }),
    ).rejects.toEqual(new AppError(400, "Supplier not found or deactivated"));
    expect(itemUpdate).not.toHaveBeenCalled();
  });

  it("soft-deletes an item and audits the deactivation", async () => {
    await expect(deleteInventoryItem("item_1")).resolves.toMatchObject({
      id: "item_1",
    });

    const updateCall = itemUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("rejects deactivating an already deactivated item", async () => {
    itemFindUnique.mockResolvedValue({ ...item, deletedAt: new Date() });

    await expect(deleteInventoryItem("item_1")).rejects.toEqual(
      new AppError(409, "Item is already deleted"),
    );
    expect(itemUpdate).not.toHaveBeenCalled();
  });

  it("restores a deactivated item and audits the reactivation", async () => {
    itemFindUnique.mockResolvedValue({ ...item, deletedAt: new Date() });

    await expect(restoreInventoryItem("item_1")).resolves.toMatchObject({
      id: "item_1",
    });

    const updateCall = itemUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.deletedAt).toBeNull();
  });

  it("rejects restoring an item that is not deactivated", async () => {
    await expect(restoreInventoryItem("item_1")).rejects.toEqual(
      new AppError(409, "Item is not deleted"),
    );
    expect(itemUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["RECEIPT", "2.500", "12.5"],
    ["RETURN", "3.000", "13"],
    ["ISSUE", "2.500", "7.5"],
    ["SALE", "1.000", "9"],
    ["ADJUSTMENT", "4.000", "14"],
    ["ADJUSTMENT", "-4.000", "6"],
  ] as const)(
    "applies a %s of %s to the on-hand quantity",
    async (type, quantity, expectedQuantity) => {
      await expect(
        createStockMovement(
          "item_1",
          { type, quantity, unit: "METER", reference: "PO-100" },
          "user_1",
        ),
      ).resolves.toMatchObject({ id: "movement_1" });

      const updateCall = itemUpdate.mock.calls[0]?.[0];
      expect(updateCall.data.quantity).toEqual(
        new Prisma.Decimal(expectedQuantity),
      );
      expect(movementCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itemId: "item_1",
          type,
          quantity: new Prisma.Decimal(quantity),
          unit: "METER",
        }),
      });
    },
  );

  it("rejects an ISSUE or SALE that would drive stock below zero", async () => {
    for (const type of ["ISSUE", "SALE"] as const) {
      await expect(
        createStockMovement(
          "item_1",
          {
            type,
            quantity: "12.000",
            unit: "METER",
          },
          "user_1",
        ),
      ).rejects.toEqual(new AppError(409, "Stock cannot go below zero"));
      expect(movementCreate).not.toHaveBeenCalled();
    }
  });

  it("allows a negative ADJUSTMENT to correct stock below zero", async () => {
    await expect(
      createStockMovement(
        "item_1",
        {
          type: "ADJUSTMENT",
          quantity: "-15.000",
          unit: "METER",
        },
        "user_1",
      ),
    ).resolves.toMatchObject({ id: "movement_1" });

    const updateCall = itemUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.quantity).toEqual(new Prisma.Decimal("-5"));
  });

  it("does not re-validate the supplier when an update keeps it unchanged", async () => {
    await expect(
      updateInventoryItem("item_1", { supplierId: "supplier_1" }),
    ).resolves.toMatchObject({ id: "item_1" });
    expect(supplierFindFirst).not.toHaveBeenCalled();
  });

  it("rejects a movement whose unit differs from the item unit", async () => {
    await expect(
      createStockMovement(
        "item_1",
        { type: "RECEIPT", quantity: "2.500", unit: "ROLL" },
        "user_1",
      ),
    ).rejects.toEqual(
      new AppError(400, "Movement unit does not match the item unit"),
    );
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it("rejects a movement for a missing or deactivated item", async () => {
    itemFindFirst.mockResolvedValue(null);

    await expect(
      createStockMovement(
        "item_1",
        { type: "RECEIPT", quantity: "2.500", unit: "METER" },
        "user_1",
      ),
    ).rejects.toEqual(new AppError(404, "Item not found"));
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it("lists movements most recent first with a type filter", async () => {
    itemFindUnique.mockResolvedValue(item);
    movementFindMany.mockResolvedValue([issuedMovement]);
    movementCount.mockResolvedValue(1);

    await expect(
      listStockMovements("item_1", {
        page: 1,
        limit: 10,
        type: "ISSUE",
        order: "desc",
      }),
    ).resolves.toMatchObject({
      data: [
        {
          id: "movement_1",
          quantity: "2.5",
          orderItemId: "order_item_1",
          orderItem: { id: "order_item_1", orderId: "order_1" },
        },
      ],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    expect(movementFindMany).toHaveBeenCalledWith({
      where: { itemId: "item_1", type: "ISSUE" },
      include: { orderItem: true },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });
  });
});
