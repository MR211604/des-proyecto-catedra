import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const {
  transaction,
  clientFindFirst,
  inventoryItemFindMany,
  quoteCreate,
  quoteFindUnique,
  quoteUpdate,
  audit,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  clientFindFirst: vi.fn(),
  inventoryItemFindMany: vi.fn(),
  quoteCreate: vi.fn(),
  quoteFindUnique: vi.fn(),
  quoteUpdate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    inventoryItem: { findMany: inventoryItemFindMany },
    quote: { findUnique: quoteFindUnique },
  },
}));
vi.mock("../../lib/audit.js", () => ({ createAuditLog: audit }));

const { createQuote, getQuoteById, updateQuote } = await import("./service.js");
import type { CreateQuoteInput } from "./schema.js";

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

const material = {
  id: "material_1",
  quoteItemId: "item_1",
  inventoryItemId: "inventory_1",
  quantity: new Prisma.Decimal("2.500"),
  inventoryItem,
};

const quoteItem = {
  id: "item_1",
  quoteId: "quote_1",
  description: "Hem",
  quantity: new Prisma.Decimal("2.000"),
  unitPrice: new Prisma.Decimal("10.00"),
  total: new Prisma.Decimal("20.00"),
  specifications: null,
  materials: [material],
};

const quote = {
  id: "quote_1",
  number: 7,
  status: "DRAFT",
  clientId: "client_1",
  subtotal: new Prisma.Decimal("25.00"),
  total: new Prisma.Decimal("25.00"),
  validUntil: null,
  notes: null,
  items: [
    {
      id: "item_1",
      description: "Hem",
      quantity: new Prisma.Decimal("2.500"),
      unitPrice: new Prisma.Decimal("10.00"),
      total: new Prisma.Decimal("25.00"),
      specifications: null,
    },
  ],
  client: { id: "client_1", name: "Ana" },
  order: null,
};

const baseInput: CreateQuoteInput = {
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
};

const tx = {
  client: { findFirst: clientFindFirst },
  inventoryItem: { findMany: inventoryItemFindMany },
  quote: {
    create: quoteCreate,
    findUnique: quoteFindUnique,
    update: quoteUpdate,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) =>
    callback(tx),
  );
  clientFindFirst.mockResolvedValue({ id: "client_1" });
  inventoryItemFindMany.mockResolvedValue([inventoryItem]);
  quoteCreate.mockResolvedValue(quote);
  audit.mockResolvedValue(undefined);
});

describe("quote service persistence boundary", () => {
  it("calculates money with Prisma Decimal and serializes exact values", async () => {
    await expect(
      createQuote(
        {
          clientId: "client_1",
          items: [
            { description: "Hem", quantity: "2.500", unitPrice: "10.00" },
          ],
        },
        "user_1",
      ),
    ).resolves.toMatchObject({ subtotal: "25", total: "25" });

    const createCall = quoteCreate.mock.calls[0]?.[0];
    expect(createCall.data.items.create[0].quantity).toEqual(
      new Prisma.Decimal("2.500"),
    );
    expect(createCall.data.items.create[0].total).toEqual(
      new Prisma.Decimal("25.00"),
    );
    expect(audit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        actorId: "user_1",
        action: "quote.created",
        after: expect.objectContaining({ total: "25" }),
      }),
    );
  });

  it("expires an overdue sent quote on read and audits the transition", async () => {
    const overdue = {
      ...quote,
      status: "SENT",
      validUntil: new Date("2025-01-01T00:00:00.000Z"),
    };
    const expired = { ...overdue, status: "EXPIRED" };
    quoteFindUnique
      .mockResolvedValueOnce(overdue)
      .mockResolvedValueOnce(overdue);
    quoteUpdate.mockResolvedValue(expired);

    await expect(getQuoteById("quote_1")).resolves.toMatchObject({
      id: "quote_1",
      status: "EXPIRED",
    });
    expect(quoteUpdate).toHaveBeenCalledWith({
      where: { id: "quote_1", status: "SENT" },
      data: { status: "EXPIRED" },
      include: expect.anything(),
    });
    expect(audit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        actorId: "system:quote-expiration",
        action: "quote.expired",
        before: expect.objectContaining({ status: "SENT" }),
        after: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
  });
});

describe("quotes service material lists", () => {
  it("persists each item's material list on creation", async () => {
    quoteCreate.mockResolvedValue({
      ...quote,
      items: [
        {
          ...quoteItem,
          quantity: new Prisma.Decimal("2.500"),
          unitPrice: new Prisma.Decimal("10.00"),
          total: new Prisma.Decimal("25.00"),
        },
      ],
    });

    await expect(createQuote(baseInput, "user_1")).resolves.toMatchObject({
      id: "quote_1",
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

    const createCall = quoteCreate.mock.calls[0]?.[0];
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
    const input: CreateQuoteInput = {
      clientId: "client_1",
      items: [{ description: "Hem", quantity: "2", unitPrice: "10" }],
    };

    await expect(createQuote(input, "user_1")).resolves.toMatchObject({
      id: "quote_1",
    });

    const createCall = quoteCreate.mock.calls[0]?.[0];
    expect(createCall.data.items.create[0].materials).toBeUndefined();
    expect(inventoryItemFindMany).not.toHaveBeenCalled();
  });

  it("rejects a material whose inventory item is missing or deactivated", async () => {
    inventoryItemFindMany.mockResolvedValue([]);

    await expect(createQuote(baseInput, "user_1")).rejects.toEqual(
      new AppError(400, "Material not found or deactivated"),
    );
    expect(quoteCreate).not.toHaveBeenCalled();
  });

  it("rejects a material whose unit differs from the inventory item unit", async () => {
    inventoryItemFindMany.mockResolvedValue([
      { id: "inventory_1", unit: "ROLL" },
    ]);

    await expect(createQuote(baseInput, "user_1")).rejects.toEqual(
      new AppError(400, "Material unit does not match the inventory item unit"),
    );
    expect(quoteCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate materials within the same quote item", async () => {
    const input: CreateQuoteInput = {
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

    await expect(createQuote(input, "user_1")).rejects.toEqual(
      new AppError(400, "Duplicate material within the same quote item"),
    );
    expect(quoteCreate).not.toHaveBeenCalled();
  });

  it("does not check stock availability when creating a quote", async () => {
    inventoryItemFindMany.mockResolvedValue([
      { id: "inventory_1", unit: "METER" },
    ]);

    await expect(createQuote(baseInput, "user_1")).resolves.toMatchObject({
      id: "quote_1",
    });
    expect(inventoryItemFindMany).toHaveBeenCalledTimes(1);
  });

  it("recreates the material list through the item-replacement flow on update", async () => {
    quoteFindUnique.mockResolvedValue({
      ...quote,
      items: [{ ...quoteItem, materials: [] }],
    });
    quoteUpdate.mockResolvedValue({
      ...quote,
      items: [{ ...quoteItem, materials: [] }],
    });
    const input: CreateQuoteInput = {
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

    await expect(
      updateQuote("quote_1", input, "user_1"),
    ).resolves.toMatchObject({ id: "quote_1" });

    const updateCall = quoteUpdate.mock.calls[0]?.[0];
    expect(updateCall.data.items).toEqual({
      deleteMany: {},
      create: [
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
      ],
    });
  });

  it("rejects a missing inventory item when updating a quote", async () => {
    quoteFindUnique.mockResolvedValue(quote);
    inventoryItemFindMany.mockResolvedValue([]);

    await expect(updateQuote("quote_1", baseInput, "user_1")).rejects.toEqual(
      new AppError(400, "Material not found or deactivated"),
    );
    expect(quoteUpdate).not.toHaveBeenCalled();
  });

  it("still rejects updating a quote that is no longer DRAFT", async () => {
    quoteFindUnique.mockResolvedValue({ ...quote, status: "SENT" });

    await expect(updateQuote("quote_1", baseInput, "user_1")).rejects.toEqual(
      new AppError(409, "Only draft quotes can be updated"),
    );
    expect(quoteUpdate).not.toHaveBeenCalled();
  });
});
