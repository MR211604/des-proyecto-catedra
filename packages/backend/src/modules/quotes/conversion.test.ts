import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const { transaction, findUnique, create, audit } = vi.hoisted(() => ({
  transaction: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: { $transaction: transaction },
}));
vi.mock("../../lib/audit.js", () => ({ createAuditLog: audit }));

const { convertQuote } = await import("./service.js");

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
    },
  ],
  order: null,
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
    },
  ],
};

const tx = {
  quote: { findUnique },
  customerOrder: { create },
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
  audit.mockResolvedValue(undefined);
});

describe("convertQuote", () => {
  it("creates one confirmed order with all quote data and audits it atomically", async () => {
    await expect(convertQuote("quote_1", "user_1")).resolves.toEqual({
      ...order,
      items: [
        {
          ...order.items[0],
          quantity: "2.5",
          unitPrice: "10",
          total: "25",
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
            },
          ],
        },
      },
      include: { items: true },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(audit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        actorId: "user_1",
        action: "quote.converted",
        entityType: "Quote",
        entityId: "quote_1",
        before: expect.objectContaining({ id: "quote_1" }),
        after: expect.objectContaining({
          clientId: "client_1",
          notes: "Use the blue fabric",
          order: expect.objectContaining({
            id: "order_1",
            items: [
              expect.objectContaining({
                quantity: "2.5",
                unitPrice: "10",
                total: "25",
                specifications: { fabric: "blue", collar: "mandarin" },
              }),
            ],
          }),
        }),
      }),
    );
  });

  it("does not create an order when the quote is not accepted or is already linked", async () => {
    findUnique.mockResolvedValueOnce({ ...quote, status: "SENT" });
    await expect(convertQuote("quote_1", "user_1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(create).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce({ ...quote, order });
    await expect(convertQuote("quote_1", "user_1")).rejects.toMatchObject({
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
    await expect(convertQuote("quote_1", "user_1")).rejects.toEqual(
      new AppError(409, "Quote has already been converted to an order"),
    );

    create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "test",
      }),
    );
    await expect(convertQuote("quote_1", "user_1")).rejects.toEqual(
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

    await expect(convertQuote("quote_1", "user_1")).resolves.toBeDefined();
    await expect(convertQuote("quote_1", "user_1")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("propagates audit failures so the transaction can roll back", async () => {
    audit.mockRejectedValueOnce(new Error("audit unavailable"));

    await expect(convertQuote("quote_1", "user_1")).rejects.toThrow(
      "audit unavailable",
    );
    expect(create).toHaveBeenCalledOnce();
    expect(committed).toBe(false);
  });
});
