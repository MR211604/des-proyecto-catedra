import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const {
  transaction,
  clientFindFirst,
  inventoryItemFindMany,
  inventoryItemUpdate,
  stageFindMany,
  orderCreate,
  orderFindUnique,
  orderFindUniqueOrThrow,
  orderFindMany,
  orderCount,
  orderUpdate,
  jobCreateMany,
  jobDeleteMany,
  orderItemDeleteMany,
  movementCreate,
  movementFindMany,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  clientFindFirst: vi.fn(),
  inventoryItemFindMany: vi.fn(),
  inventoryItemUpdate: vi.fn(),
  stageFindMany: vi.fn(),
  orderCreate: vi.fn(),
  orderFindUnique: vi.fn(),
  orderFindUniqueOrThrow: vi.fn(),
  orderFindMany: vi.fn(),
  orderCount: vi.fn(),
  orderUpdate: vi.fn(),
  jobCreateMany: vi.fn(),
  jobDeleteMany: vi.fn(),
  orderItemDeleteMany: vi.fn(),
  movementCreate: vi.fn(),
  movementFindMany: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    client: { findFirst: clientFindFirst },
    inventoryItem: {
      findMany: inventoryItemFindMany,
      update: inventoryItemUpdate,
    },
    productionStage: { findMany: stageFindMany },
    customerOrder: {
      create: orderCreate,
      findUnique: orderFindUnique,
      findUniqueOrThrow: orderFindUniqueOrThrow,
      findMany: orderFindMany,
      count: orderCount,
      update: orderUpdate,
    },
    productionJob: { createMany: jobCreateMany, deleteMany: jobDeleteMany },
    orderItem: { deleteMany: orderItemDeleteMany },
    stockMovement: { create: movementCreate, findMany: movementFindMany },
  },
}));

const { createOrder, updateOrder, startOrderProduction, cancelOrder } =
  await import("./service.js");

import type { CreateOrderInput } from "./schema.js";

const inventoryItem = {
  id: "inventory_1",
  name: "Tela de algodón",
  sku: "TEL-001",
  unit: "METER",
  quantity: new Prisma.Decimal("10.000"),
  reorderPoint: new Prisma.Decimal("5.000"),
  supplierId: null,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  deletedAt: null,
};

const client = {
  id: "client_1",
  name: "Cliente A",
  phone: null,
  email: null,
  notes: null,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  deletedAt: null,
};

const stages = [
  { id: "stage_1", position: 0 },
  { id: "stage_2", position: 1 },
];

const orderItem = {
  id: "item_1",
  orderId: "order_1",
  description: "Hem",
  quantity: new Prisma.Decimal("2.000"),
  unitPrice: new Prisma.Decimal("10.00"),
  total: new Prisma.Decimal("20.00"),
  specifications: null,
  materials: [],
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
};

const material = {
  id: "material_1",
  orderItemId: "item_1",
  inventoryItemId: "inventory_1",
  quantity: new Prisma.Decimal("2.500"),
  inventoryItem,
};

const job = {
  id: "job_1",
  orderId: "order_1",
  orderItemId: "item_1",
  stageId: "stage_1",
  description: "Hem",
  status: "TODO",
  assignedTo: null,
  dueDate: null,
  stage: {
    id: "stage_1",
    name: "Preparación",
    position: 0,
    isActive: true,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  },
  events: [],
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
};

const order = {
  id: "order_1",
  number: 1,
  clientId: "client_1",
  quoteId: null,
  status: "CONFIRMED",
  dueDate: null,
  deliveredAt: null,
  lockedAt: null,
  notes: null,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  client,
  quote: null,
  items: [{ ...orderItem, materials: [material] }],
  jobs: [job],
};

const baseInput: CreateOrderInput = {
  clientId: "client_1",
  items: [
    {
      description: "Hem",
      quantity: "2",
      unitPrice: "10",
      materials: [
        { inventoryItemId: "inventory_1", quantity: "2.5", unit: "METER" },
      ],
    },
  ],
  jobs: [{ stageId: "stage_1", description: "Hem", orderItemIndex: 0 }],
};

const tx = {
  client: { findFirst: clientFindFirst },
  inventoryItem: {
    findMany: inventoryItemFindMany,
    update: inventoryItemUpdate,
  },
  productionStage: { findMany: stageFindMany },
  customerOrder: {
    create: orderCreate,
    findUnique: orderFindUnique,
    findUniqueOrThrow: orderFindUniqueOrThrow,
    findMany: orderFindMany,
    count: orderCount,
    update: orderUpdate,
  },
  productionJob: { createMany: jobCreateMany, deleteMany: jobDeleteMany },
  orderItem: { deleteMany: orderItemDeleteMany },
  stockMovement: { create: movementCreate, findMany: movementFindMany },
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );
  clientFindFirst.mockResolvedValue(client);
  inventoryItemFindMany.mockResolvedValue([inventoryItem]);
  stageFindMany.mockResolvedValue(stages);
  orderCreate.mockResolvedValue({ ...order, items: [orderItem] });
  orderFindUnique.mockResolvedValue(order);
  orderFindUniqueOrThrow.mockResolvedValue(order);
  orderFindMany.mockResolvedValue([order]);
  orderCount.mockResolvedValue(1);
  orderUpdate.mockResolvedValue({
    ...order,
    status: "IN_PRODUCTION",
    lockedAt: new Date("2026-09-01T00:00:00.000Z"),
    items: [orderItem],
  });
  jobCreateMany.mockResolvedValue(undefined);
  jobDeleteMany.mockResolvedValue(undefined);
  orderItemDeleteMany.mockResolvedValue(undefined);
  movementCreate.mockResolvedValue({ id: "movement_1" });
  movementFindMany.mockResolvedValue([]);
  inventoryItemUpdate.mockResolvedValue(inventoryItem);
});

describe("orders service material lists", () => {
  it("persists each item's material list on creation", async () => {
    await expect(createOrder(baseInput)).resolves.toMatchObject({
      id: "order_1",
      items: [
        {
          materials: [
            {
              id: "material_1",
              inventoryItemId: "inventory_1",
              quantity: "2.5",
              inventoryItem: { id: "inventory_1", unit: "METER" },
            },
          ],
        },
      ],
    });

    const createCall = orderCreate.mock.calls[0]?.[0];
    expect(createCall.data.items.create).toEqual([
      expect.objectContaining({
        description: "Hem",
        materials: {
          create: [
            {
              inventoryItemId: "inventory_1",
              quantity: new Prisma.Decimal("2.500"),
            },
          ],
        },
      }),
    ]);
    expect(inventoryItemFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["inventory_1"] }, deletedAt: null },
      select: { id: true, unit: true },
    });
  });

  it("allows an item without a material list", async () => {
    const input = {
      clientId: "client_1",
      items: [{ description: "Hem", quantity: "2", unitPrice: "10" }],
      jobs: [{ stageId: "stage_1", description: "Hem", orderItemIndex: 0 }],
    };

    await expect(createOrder(input)).resolves.toMatchObject({
      id: "order_1",
    });

    const createCall = orderCreate.mock.calls[0]?.[0];
    expect(createCall.data.items.create[0].materials).toBeUndefined();
    expect(inventoryItemFindMany).not.toHaveBeenCalled();
  });

  it("rejects a material whose inventory item is missing or deactivated", async () => {
    inventoryItemFindMany.mockResolvedValue([]);

    await expect(createOrder(baseInput)).rejects.toEqual(
      new AppError(400, "Material not found or deactivated"),
    );
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("rejects a material whose unit differs from the inventory item unit", async () => {
    inventoryItemFindMany.mockResolvedValue([
      { id: "inventory_1", unit: "ROLL" },
    ]);

    await expect(createOrder(baseInput)).rejects.toEqual(
      new AppError(400, "Material unit does not match the inventory item unit"),
    );
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate materials within the same order item", async () => {
    const input: CreateOrderInput = {
      ...baseInput,
      items: [
        {
          description: "Hem",
          quantity: "2",
          unitPrice: "10",
          materials: [
            { inventoryItemId: "inventory_1", quantity: "1", unit: "METER" },
            { inventoryItemId: "inventory_1", quantity: "2", unit: "METER" },
          ],
        },
      ],
    };

    await expect(createOrder(input)).rejects.toEqual(
      new AppError(400, "Duplicate material within the same order item"),
    );
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("does not check stock availability when creating an order", async () => {
    inventoryItemFindMany.mockResolvedValue([
      { id: "inventory_1", unit: "METER" },
    ]);

    await expect(createOrder(baseInput)).resolves.toMatchObject({
      id: "order_1",
    });
    expect(inventoryItemFindMany).toHaveBeenCalledTimes(1);
  });

  it("recreates the material list through the item-replacement flow on update", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      items: [{ ...orderItem, materials: [] }],
    });
    const input: CreateOrderInput = {
      ...baseInput,
      items: [
        {
          description: "Hem",
          quantity: "3",
          unitPrice: "10",
          materials: [
            { inventoryItemId: "inventory_1", quantity: "4", unit: "METER" },
          ],
        },
      ],
    };

    await expect(updateOrder("order_1", input)).resolves.toMatchObject({
      id: "order_1",
    });

    expect(orderItemDeleteMany).toHaveBeenCalledWith({
      where: { orderId: "order_1" },
    });
    const updateCall = orderUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.items.create).toEqual([
      expect.objectContaining({
        description: "Hem",
        materials: {
          create: [
            {
              inventoryItemId: "inventory_1",
              quantity: new Prisma.Decimal("4.000"),
            },
          ],
        },
      }),
    ]);
  });

  it("still rejects updating a confirmed order with production activity", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      jobs: [{ ...job, status: "IN_PROGRESS" }],
    });

    await expect(updateOrder("order_1", baseInput)).rejects.toEqual(
      new AppError(409, "Orders with production activity cannot be updated"),
    );
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});

describe("orders service production start material issue", () => {
  it("issues one movement per order-item material and decrements stock", async () => {
    await expect(
      startOrderProduction("order_1", "user_1"),
    ).resolves.toMatchObject({
      id: "order_1",
      status: "IN_PRODUCTION",
    });

    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        itemId: "inventory_1",
        orderItemId: "item_1",
        type: "ISSUE",
        quantity: new Prisma.Decimal("2.500"),
        unit: "METER",
        reference: null,
        reason: "production",
        actorId: "user_1",
      },
    });
    expect(inventoryItemUpdate).toHaveBeenCalledWith({
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("7.5") },
    });
    expect(orderUpdate).toHaveBeenCalled();
  });

  it("issues every material across multiple order items", async () => {
    const secondItem = {
      ...orderItem,
      id: "item_2",
      materials: [{ ...material, id: "material_2", orderItemId: "item_2" }],
    };
    orderFindUnique.mockResolvedValue({
      ...order,
      items: [{ ...orderItem, materials: [material] }, secondItem],
    });

    await expect(
      startOrderProduction("order_1", "user_1"),
    ).resolves.toMatchObject({ id: "order_1", status: "IN_PRODUCTION" });

    expect(movementCreate).toHaveBeenCalledTimes(2);
    expect(inventoryItemUpdate).toHaveBeenCalledTimes(2);
  });

  it("fails with 409 when a material lacks stock and leaves nothing behind", async () => {
    inventoryItemFindMany.mockResolvedValue([
      { ...inventoryItem, quantity: new Prisma.Decimal("1.000") },
    ]);

    await expect(startOrderProduction("order_1", "user_1")).rejects.toEqual(
      new AppError(409, "Insufficient stock to start production"),
    );
    expect(movementCreate).not.toHaveBeenCalled();
    expect(inventoryItemUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("rejects starting when the combined demand exceeds available stock", async () => {
    const secondItem = {
      ...orderItem,
      id: "item_2",
      materials: [{ ...material, id: "material_2", orderItemId: "item_2" }],
    };
    orderFindUnique.mockResolvedValue({
      ...order,
      items: [{ ...orderItem, materials: [material] }, secondItem],
    });
    inventoryItemFindMany.mockResolvedValue([
      { ...inventoryItem, quantity: new Prisma.Decimal("4.000") },
    ]);

    await expect(startOrderProduction("order_1", "user_1")).rejects.toEqual(
      new AppError(409, "Insufficient stock to start production"),
    );
    expect(movementCreate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("fails with 409 when a material is missing or deactivated", async () => {
    inventoryItemFindMany.mockResolvedValue([]);

    await expect(startOrderProduction("order_1", "user_1")).rejects.toEqual(
      new AppError(409, "Material not found or deactivated"),
    );
    expect(movementCreate).not.toHaveBeenCalled();
    expect(inventoryItemUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("starts production without movements when the order has no materials", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      items: [{ ...orderItem, materials: [] }],
    });

    await expect(
      startOrderProduction("order_1", "user_1"),
    ).resolves.toMatchObject({ id: "order_1", status: "IN_PRODUCTION" });
    expect(inventoryItemFindMany).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
    expect(inventoryItemUpdate).not.toHaveBeenCalled();
  });
});

describe("orders service cancellation material returns", () => {
  const issuedMovement = {
    id: "movement_1",
    itemId: "inventory_1",
    orderItemId: "item_1",
    type: "ISSUE",
    quantity: new Prisma.Decimal("2.500"),
    unit: "METER",
    reference: null,
    reason: "production",
    actorId: "user_1",
    createdAt: new Date("2026-09-02T00:00:00.000Z"),
  };

  it("mirrors each production ISSUE with a RETURN and restores the on-hand quantity", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      status: "IN_PRODUCTION",
    });
    movementFindMany.mockResolvedValue([issuedMovement]);
    inventoryItemFindMany.mockResolvedValue([
      { ...inventoryItem, quantity: new Prisma.Decimal("7.500") },
    ]);
    orderUpdate.mockResolvedValue({
      ...order,
      status: "CANCELLED",
    });

    await expect(cancelOrder("order_1", "user_2")).resolves.toMatchObject({
      id: "order_1",
      status: "CANCELLED",
    });

    expect(movementFindMany).toHaveBeenCalledWith({
      where: { orderItemId: { in: ["item_1"] }, type: "ISSUE" },
    });
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        itemId: "inventory_1",
        orderItemId: "item_1",
        type: "RETURN",
        quantity: new Prisma.Decimal("2.500"),
        unit: "METER",
        reference: null,
        reason: "cancellation",
        actorId: "user_2",
      },
    });
    expect(inventoryItemUpdate).toHaveBeenCalledWith({
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("10") },
    });
    expect(orderUpdate).toHaveBeenCalled();
  });

  it("returns every issued movement across multiple order items", async () => {
    const secondIssuedMovement = {
      ...issuedMovement,
      id: "movement_2",
      itemId: "inventory_2",
      orderItemId: "item_2",
    };
    orderFindUnique.mockResolvedValue({
      ...order,
      status: "IN_PRODUCTION",
      items: [
        { ...orderItem, id: "item_1" },
        { ...orderItem, id: "item_2" },
      ],
    });
    movementFindMany.mockResolvedValue([issuedMovement, secondIssuedMovement]);
    inventoryItemFindMany.mockResolvedValue([
      {
        ...inventoryItem,
        id: "inventory_1",
        quantity: new Prisma.Decimal("7.500"),
      },
      {
        ...inventoryItem,
        id: "inventory_2",
        quantity: new Prisma.Decimal("3.000"),
      },
    ]);
    orderUpdate.mockResolvedValue({
      ...order,
      status: "CANCELLED",
    });

    await expect(cancelOrder("order_1", "user_2")).resolves.toMatchObject({
      id: "order_1",
      status: "CANCELLED",
    });

    expect(movementFindMany).toHaveBeenCalledWith({
      where: { orderItemId: { in: ["item_1", "item_2"] }, type: "ISSUE" },
    });
    expect(movementCreate).toHaveBeenNthCalledWith(1, {
      data: {
        itemId: "inventory_1",
        orderItemId: "item_1",
        type: "RETURN",
        quantity: new Prisma.Decimal("2.500"),
        unit: "METER",
        reference: null,
        reason: "cancellation",
        actorId: "user_2",
      },
    });
    expect(movementCreate).toHaveBeenNthCalledWith(2, {
      data: {
        itemId: "inventory_2",
        orderItemId: "item_2",
        type: "RETURN",
        quantity: new Prisma.Decimal("2.500"),
        unit: "METER",
        reference: null,
        reason: "cancellation",
        actorId: "user_2",
      },
    });
    expect(inventoryItemUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("10") },
    });
    expect(inventoryItemUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "inventory_2" },
      data: { quantity: new Prisma.Decimal("5.5") },
    });
  });

  it("accumulates returns when multiple ISSUE movements target the same inventory item", async () => {
    const secondIssuedMovement = {
      ...issuedMovement,
      id: "movement_2",
      orderItemId: "item_2",
    };
    orderFindUnique.mockResolvedValue({
      ...order,
      status: "IN_PRODUCTION",
      items: [
        { ...orderItem, id: "item_1" },
        { ...orderItem, id: "item_2" },
      ],
    });
    movementFindMany.mockResolvedValue([issuedMovement, secondIssuedMovement]);
    inventoryItemFindMany.mockResolvedValue([
      { ...inventoryItem, quantity: new Prisma.Decimal("4.000") },
    ]);
    orderUpdate.mockResolvedValue({
      ...order,
      status: "CANCELLED",
    });

    await expect(cancelOrder("order_1", "user_2")).resolves.toMatchObject({
      id: "order_1",
      status: "CANCELLED",
    });

    expect(movementCreate).toHaveBeenCalledTimes(2);
    expect(inventoryItemUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("6.5") },
    });
    expect(inventoryItemUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("9") },
    });
  });

  it("still returns stock for an inventory item deactivated after issue", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      status: "IN_PRODUCTION",
    });
    movementFindMany.mockResolvedValue([issuedMovement]);
    inventoryItemFindMany.mockResolvedValue([
      {
        ...inventoryItem,
        quantity: new Prisma.Decimal("7.500"),
        deletedAt: new Date("2026-09-05T00:00:00.000Z"),
      },
    ]);
    orderUpdate.mockResolvedValue({
      ...order,
      status: "CANCELLED",
    });

    await expect(cancelOrder("order_1", "user_2")).resolves.toMatchObject({
      id: "order_1",
      status: "CANCELLED",
    });

    expect(inventoryItemFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["inventory_1"] } },
    });
    expect(movementCreate).toHaveBeenCalledTimes(1);
    expect(inventoryItemUpdate).toHaveBeenCalledWith({
      where: { id: "inventory_1" },
      data: { quantity: new Prisma.Decimal("10") },
    });
  });

  it("leaves inventory untouched when the order has no issued materials", async () => {
    orderFindUnique.mockResolvedValue({
      ...order,
      status: "IN_PRODUCTION",
    });
    movementFindMany.mockResolvedValue([]);
    orderUpdate.mockResolvedValue({
      ...order,
      status: "CANCELLED",
    });

    await expect(cancelOrder("order_1", "user_2")).resolves.toMatchObject({
      id: "order_1",
      status: "CANCELLED",
    });

    expect(inventoryItemFindMany).not.toHaveBeenCalled();
    expect(movementCreate).not.toHaveBeenCalled();
    expect(inventoryItemUpdate).not.toHaveBeenCalled();
  });
});
