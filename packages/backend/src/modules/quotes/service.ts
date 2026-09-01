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
const READ_EXPIRATION_ACTOR = "system:quote-expiration";

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

function stateConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2034")
  ) {
    throw new AppError(409, "Quote state changed; retry the operation");
  }
  throw error;
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
  return serialize(await expireQuoteIfNeeded(id, READ_EXPIRATION_ACTOR, quote));
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
  const expiredCandidates = await prisma.quote.findMany({
    where: { status: "SENT", validUntil: { lte: new Date() } },
    select: { id: true, status: true, validUntil: true },
  });
  await Promise.all(
    expiredCandidates.map((quote) =>
      expireQuoteIfNeeded(quote.id, READ_EXPIRATION_ACTOR, quote),
    ),
  );
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
  const currentQuotes = await Promise.all(
    quotes.map((quote) => expireQuoteIfNeeded(quote.id, READ_EXPIRATION_ACTOR, quote)),
  );
  return {
    data: serialize(currentQuotes),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function expireQuoteIfNeeded<T extends { status: string; validUntil: Date | null }>(
  id: string,
  actorId: string,
  quote: T,
) {
  if (quote.status !== "SENT" || !quote.validUntil || quote.validUntil > new Date()) {
    return quote;
  }

  return prisma.$transaction(
    async (tx) => {
      const before = await tx.quote.findUnique({
        where: { id },
        include: quoteInclude,
      });
      if (
        before?.status !== "SENT" ||
        !before.validUntil ||
        before.validUntil > new Date()
      ) {
        return before ?? quote;
      }
      const expired = await tx.quote.update({
        where: { id, status: "SENT" },
        data: { status: "EXPIRED" },
        include: quoteInclude,
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "quote.expired",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(before),
        after: serialize(expired),
      });
      return expired;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ).catch(stateConflict);
}

async function transitionQuote(
  id: string,
  actorId: string,
  fromStatus: "DRAFT" | "SENT",
  toStatus: "SENT" | "ACCEPTED" | "REJECTED",
  action: "sent" | "accepted" | "rejected",
) {
  return prisma.$transaction(
    async (tx) => {
      const before = await tx.quote.findUnique({
        where: { id },
        include: quoteInclude,
      });
      if (!before) throw new AppError(404, "Quote not found");
      if (before.status !== fromStatus) {
        throw new AppError(
          409,
          `Quote cannot transition from ${before.status} to ${toStatus}`,
        );
      }
      if (
        fromStatus === "SENT" &&
        before.validUntil &&
        before.validUntil <= new Date()
      ) {
        const expired = await tx.quote.update({
          where: { id, status: "SENT" },
          data: { status: "EXPIRED" },
          include: quoteInclude,
        });
        await createAuditLog(tx as typeof prisma, {
          actorId,
          action: "quote.expired",
          entityType: ENTITY_TYPE,
          entityId: id,
          before: serialize(before),
          after: serialize(expired),
        });
        return { expired: true as const };
      }
      if (toStatus === "SENT" && (!before.validUntil || before.validUntil <= new Date())) {
        throw new AppError(409, "A quote can only be sent with a future validUntil");
      }
      const after = await tx.quote.update({
        where: { id, status: fromStatus },
        data: {
          status: toStatus,
          ...(toStatus === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
          ...(toStatus === "REJECTED" ? { rejectedAt: new Date() } : {}),
        },
        include: quoteInclude,
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: `quote.${action}`,
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(before),
        after: serialize(after),
      });
      return { expired: false as const, quote: serialize(after) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ).then((result) => {
    if (result.expired) {
      throw new AppError(409, "Quote has expired and cannot be transitioned");
    }
    return result.quote;
  }).catch(stateConflict);
}

export function sendQuote(id: string, actorId: string) {
  return transitionQuote(id, actorId, "DRAFT", "SENT", "sent");
}

export async function acceptQuote(id: string, actorId: string) {
  return transitionQuote(id, actorId, "SENT", "ACCEPTED", "accepted");
}

export function rejectQuote(id: string, actorId: string) {
  return transitionQuote(id, actorId, "SENT", "REJECTED", "rejected");
}

export async function convertQuote(id: string, actorId: string) {
  return prisma.$transaction(
    async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id },
        include: quoteInclude,
      });
      if (!quote) throw new AppError(404, "Quote not found");
      if (quote.status !== "ACCEPTED") {
        throw new AppError(409, "Only accepted quotes can be converted to an order");
      }
      if (quote.order) {
        throw new AppError(409, "Quote has already been converted to an order");
      }
      const order = await tx.customerOrder.create({
        data: {
          clientId: quote.clientId,
          quoteId: quote.id,
          notes: quote.notes,
          status: "CONFIRMED",
          items: {
            create: quote.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              specifications: item.specifications ?? undefined,
            })),
          },
        },
        include: { items: true },
      });
      await createAuditLog(tx as typeof prisma, {
        actorId,
        action: "quote.converted",
        entityType: ENTITY_TYPE,
        entityId: id,
        before: serialize(quote),
        after: serialize({ ...quote, order }),
      });
      return serialize(order);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  ).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Quote has already been converted to an order");
    }
    throw error;
  });
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
