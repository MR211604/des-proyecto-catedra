import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { createAuditLog } from "../../lib/audit.js";
import { AppError } from "../../middleware/errors.js";
import type { CreateQuoteInput, ListQuotesQuery } from "./schema.js";

const ENTITY_TYPE = "Quote";
const quoteInclude = {
  client: true,
  items: true,
  order: { include: { items: true } },
} as const;

function toPrismaDecimal(value: string) {
  return new Prisma.Decimal(value);
}

function serialize(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
    );
  }
  return value;
}

function quoteData(input: CreateQuoteInput) {
  const items = input.items.map((item) => ({
    description: item.description,
    quantity: toPrismaDecimal(item.quantity),
    unitPrice: toPrismaDecimal(item.unitPrice),
    total: toPrismaDecimal(item.quantity)
      .mul(toPrismaDecimal(item.unitPrice))
      .toDecimalPlaces(2),
    specifications: item.specifications as Prisma.InputJsonValue | undefined,
  }));
  const subtotal = items.reduce(
    (sum, item) => sum.add(item.total),
    new Prisma.Decimal(0),
  );

  return {
    clientId: input.clientId,
    validUntil: input.validUntil,
    notes: input.notes,
    subtotal,
    total: subtotal,
    items,
  };
}

export async function createQuote(input: CreateQuoteInput, actorId: string) {
  const data = quoteData(input);

  return prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: data.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const quote = await tx.quote.create({
        data: {
          clientId: data.clientId,
          validUntil: data.validUntil,
          notes: data.notes,
          subtotal: data.subtotal,
          total: data.total,
          items: { create: data.items },
        },
        include: quoteInclude,
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "quote.created",
        entityType: ENTITY_TYPE,
        entityId: quote.id,
        after: serialize(quote),
      });
      return serialize(quote);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getQuoteById(id: string) {
  // Keep deactivated clients on historical quotes; only new quotes require an active client.
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: quoteInclude,
  });
  if (!quote) throw new AppError(404, "Quote not found");
  return serialize(quote);
}

export async function listQuotes(params: ListQuotesQuery) {
  // Historical quotes retain their related deactivated clients in read responses.
  const { page, limit, status, clientId, search, sortBy, order } = params;
  const searchConditions = search
    ? [
        ...(/^\d+$/.test(search) ? [{ number: Number(search) }] : []),
        { notes: { contains: search, mode: "insensitive" as const } },
        {
          items: {
            some: {
              description: { contains: search, mode: "insensitive" as const },
            },
          },
        },
      ]
    : undefined;
  const where = {
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(searchConditions ? { OR: searchConditions } : {}),
  };
  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: quoteInclude,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ]);
  return {
    data: serialize(quotes),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateQuote(
  id: string,
  input: CreateQuoteInput,
  actorId: string,
) {
  const data = quoteData(input);
  return prisma.$transaction(
    async (tx) => {
      const before = await tx.quote.findUnique({
        where: { id },
        include: quoteInclude,
      });
      if (!before) throw new AppError(404, "Quote not found");
      if (before.status !== "DRAFT")
        throw new AppError(409, "Only draft quotes can be updated");
      const client = await tx.client.findFirst({
        where: { id: data.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const quote = await tx.quote.update({
        where: { id },
        data: {
          clientId: data.clientId,
          validUntil: data.validUntil,
          notes: data.notes,
          subtotal: data.subtotal,
          total: data.total,
          items: { deleteMany: {}, create: data.items },
        },
        include: quoteInclude,
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "quote.updated",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(before),
        after: serialize(quote),
      });
      return serialize(quote);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deleteQuote(id: string, actorId: string) {
  return prisma.$transaction(
    async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id },
        include: quoteInclude,
      });
      if (!quote) throw new AppError(404, "Quote not found");
      if (quote.status !== "DRAFT")
        throw new AppError(409, "Only draft quotes can be deleted");
      await tx.quote.delete({ where: { id } });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "quote.deleted",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(quote),
      });
      return { id, deleted: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
