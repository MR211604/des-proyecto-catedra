import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const { transaction, findUnique, create, createMany } = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: { $transaction: transaction },
}));

const { convertQuote } = await import("./service.js");

const inactiveOutOfStockInventoryItem = {
  id: "inventory_1",
  unit: "METER",
  quantity: new Prisma.Decimal("0.000"),
  deletedAt: new Date("2026-09-02T00:00:00.000Z"),
};

const quoteMaterial = {
  id: "quote_material_1",
  quoteItemId: "quote_item_1",
  inventoryItemId: "inventory_1",
  quantity: new Prisma.Decimal("3.000"),
  inventoryItem: inactiveOutOfStockInventoryItem,
};

const quote = {
  id: "quote_1",
  clientId: "client_1",
  status: "ACCEPTED",
  notes: "Use the blue fabric",
  items: [
    {
      id: "quote_item_1",
      description: "Custom shirt",
      quantity: new Prisma.Decimal("2.500"),
      unitPrice: new Prisma.Decimal("10.00"),
      total: new Prisma.Decimal("25.00"),
      specifications: { fabric: "blue", collar: "mandarin" },
      materials: [quoteMaterial],
    },
  ],
  order: null,
};

const orderMaterial = {
  id: "order_material_1",
  orderItemId: "order_item_1",
  inventoryItemId: "inventory_1",
  quantity: quoteMaterial.quantity,
  inventoryItem: inactiveOutOfStockInventoryItem,
};

const order = {
  id: "order_1",
  clientId: "client_1",
  quoteId: "quote_1",
  status: "CONFIRMED",
  dueDate: null,
  notes: quote.notes,
  items: [
    {
      id: "order_item_1",
      description: "Custom shirt",
      quantity: new Prisma.Decimal("2.500"),
      unitPrice: new Prisma.Decimal("10.00"),
      total: new Prisma.Decimal("25.00"),
      specifications: { fabric: "blue", collar: "mandarin" },
      materials: [orderMaterial],
    },
  ],
  jobs: [
    {
      id: "job_1",
      orderId: "order_1",
      orderItemId: "order_item_1",
      stageId: "stage_1",
      description: "Custom shirt",
      status: "TODO",
    },
  ],
};

const tx = {
  quote: { findUnique },
  customerOrder: { create, findUniqueOrThrow: vi.fn() },
  productionStage: { findMany: vi.fn() },
  productionJob: { createMany },
};
const quoteItem = quote.items.at(0);
if (!quoteItem) throw new Error("Quote fixture requires an item");
let committed = false;

beforeEach(() => {
  vi.clearAllMocks();
  committed = false;
  transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => {
      const result = await callback(tx);
      committed = true;
      return result;
    },
  );
  findUnique.mockResolvedValue(quote);
  create.mockResolvedValue(order);
  tx.customerOrder.findUniqueOrThrow.mockResolvedValue(order);
  tx.productionStage.findMany.mockResolvedValue([
    { id: "stage_1", position: 1, isActive: true },
  ]);
  createMany.mockResolvedValue({ count: 1 });
});

describe("convertQuote", () => {
  it("creates one confirmed order with all quote data and audits it atomically", async () => {
    await expect(convertQuote("quote_1", "stage_1")).resolves.toEqual({
      ...order,
      items: [
        {
          ...order.items[0],
          quantity: "2.5",
          unitPrice: "10",
          total: "25",
          materials: [
            {
              ...orderMaterial,
              quantity: "3",
              inventoryItem: {
                ...inactiveOutOfStockInventoryItem,
                quantity: "0",
                deletedAt: "2026-09-02T00:00:00.000Z",
              },
            },
          ],
        },
      ],
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        clientId: "client_1",
        quoteId: "quote_1",
        notes: "Use the blue fabric",
        status: "CONFIRMED",
        dueDate: null,
        items: {
          create: [
            {
              description: "Custom shirt",
              quantity: quoteItem.quantity,
              unitPrice: quoteItem.unitPrice,
              total: quoteItem.total,
              specifications: quoteItem.specifications,
              materials: {
                create: [
                  {
                    inventoryItemId: "inventory_1",
                    quantity: quoteMaterial.quantity,
                  },
                ],
              },
            },
          ],
        },
      },
      include: { items: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId: "order_1",
          orderItemId: "order_item_1",
          stageId: "stage_1",
          description: "Custom shirt",
          status: "TODO",
        },
      ],
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("copies quote item materials onto order items even when the material is inactive or out of stock", async () => {
    await expect(convertQuote("quote_1", "stage_1")).resolves.toMatchObject({
      id: "order_1",
      items: [
        {
          materials: [
            {
              inventoryItemId: "inventory_1",
              quantity: "3",
            },
          ],
        },
      ],
    });

    const createCall = create.mock.calls[0]?.[0];
    expect(createCall.data.items.create[0].materials).toEqual({
      create: [
        {
          inventoryItemId: "inventory_1",
          quantity: quoteMaterial.quantity,
        },
      ],
    });
  });

  it("does not create an order when the quote is not accepted or is already linked", async () => {
    findUnique.mockResolvedValueOnce({ ...quote, status: "SENT" });
    await expect(convertQuote("quote_1", "stage_1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(create).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce({ ...quote, order });
    await expect(convertQuote("quote_1", "stage_1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps duplicate and serialization conflicts to HTTP conflicts", async () => {
    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await expect(convertQuote("quote_1", "stage_1")).rejects.toEqual(
      new AppError(409, "Quote has already been converted to an order"),
    );

    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "test",
      }),
    );
    await expect(convertQuote("quote_1", "stage_1")).rejects.toEqual(
      new AppError(409, "Quote state changed; retry the operation"),
    );
  });

  it("returns a conflict on a repeated request without creating a second order", async () => {
    create.mockResolvedValueOnce(order).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(convertQuote("quote_1", "stage_1")).resolves.toBeDefined();
    await expect(convertQuote("quote_1", "stage_1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("propagates audit failures so the transaction can roll back", async () => {
    await expect(convertQuote("quote_1", "stage_1")).rejects.toThrow(
      "audit unavailable",
    );
    expect(create).toHaveBeenCalledOnce();
    expect(committed).toBe(false);
  });
});
