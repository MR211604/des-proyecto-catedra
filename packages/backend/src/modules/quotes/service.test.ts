import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";

const { transaction, clientFindFirst, quoteCreate, quoteFindUnique, quoteUpdate, audit } =
  vi.hoisted(() => ({
    transaction: vi.fn(),
    clientFindFirst: vi.fn(),
    quoteCreate: vi.fn(),
    quoteFindUnique: vi.fn(),
    quoteUpdate: vi.fn(),
    audit: vi.fn(),
  }));

vi.mock("../../db/prisma.js", () => ({
  prisma: { $transaction: transaction, quote: { findUnique: quoteFindUnique } },
}));
vi.mock("../../lib/audit.js", () => ({ createAuditLog: audit }));

const { createQuote, getQuoteById } = await import("./service.js");

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

const tx = {
  client: { findFirst: clientFindFirst },
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
