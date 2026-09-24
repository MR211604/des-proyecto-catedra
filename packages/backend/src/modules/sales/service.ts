import { prisma } from "../../db/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";
import { serialize, toPrismaDecimal } from "../utils.js";
import type {
  CreatePaymentInput,
  CreateSaleInput,
  ListPaymentsQuery,
  ListSalesQuery,
  UpdatePaymentInput,
} from "./schema.js";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

const saleInclude = {
  items: true,
  payments: { orderBy: { paidAt: "asc" as const } },
  // Historical sales retain their associated customer reference, including deactivated customers.
  order: { include: { client: true } },
} as const;

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

async function serializable<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  message = "Sale state changed; retry the operation",
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isPrismaError(error, "P2034") && attempt < 2) continue;
      if (isPrismaError(error, "P2034") || isPrismaError(error, "P2025")) {
        throw new AppError(409, message);
      }
      throw error;
    }
  }
  throw new AppError(409, message);
}

function saleWithBalances<
  T extends {
    total: Prisma.Decimal;
    payments: Array<{ amount: Prisma.Decimal }>;
  },
>(sale: T) {
  const paidAmount = paymentTotal(sale.payments);
  return serialize({
    ...sale,
    paidAmount,
    outstandingBalance: sale.total.sub(paidAmount),
  });
}

function paymentTotal(payments: Array<{ amount: Prisma.Decimal }>) {
  return payments.reduce(
    (sum, payment) => sum.add(payment.amount),
    new Prisma.Decimal(0),
  );
}

async function refreshSaleStatus(
  tx: TransactionClient,
  saleId: string,
  expectedStatus: "OPEN" | "PAID",
) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: { payments: true },
  });
  if (!sale) throw new AppError(404, "Sale not found");

  const paid = paymentTotal(sale.payments);
  const status = paid.eq(sale.total) ? "PAID" : "OPEN";
  return tx.sale.update({
    where: { id: saleId, status: expectedStatus },
    data: { status },
  });
}

async function getSaleWithBalances(tx: TransactionClient, saleId: string) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: saleInclude,
  });
  if (!sale) throw new AppError(404, "Sale not found");
  return saleWithBalances(sale);
}

function saleItemsFromOrder(
  items: Array<{
    description: string;
    quantity: Prisma.Decimal;
    unitPrice: Prisma.Decimal;
  }>,
) {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.quantity.mul(item.unitPrice).toDecimalPlaces(2),
  }));
}

export async function createSale(input: CreateSaleInput) {
  return serializable(async (tx) => {
    const order = await tx.customerOrder.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw new AppError(404, "Order not found");
    if (order.items.length === 0) {
      throw new AppError(409, "An order without items cannot have a sale");
    }

    const items = saleItemsFromOrder(order.items);
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    try {
      const sale = await tx.sale.create({
        data: {
          orderId: order.id,
          subtotal,
          total: subtotal,
          items: { create: items },
        },
        include: saleInclude,
      });
      return saleWithBalances(sale);
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        throw new AppError(409, "A sale already exists for this order");
      }
      throw error;
    }
  });
}

export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
  if (!sale) throw new AppError(404, "Sale not found");
  return saleWithBalances(sale);
}

export async function listSales(params: ListSalesQuery) {
  const { page, limit, status, orderId, sortBy, order } = params;
  const where = {
    ...(status ? { status } : {}),
    ...(orderId ? { orderId } : {}),
  };
  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: saleInclude,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data: sales.map(saleWithBalances),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function voidSale(id: string) {
  return serializable(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: saleInclude,
    });
    if (!sale) throw new AppError(404, "Sale not found");
    if (sale.status === "VOIDED") {
      throw new AppError(409, "Sale is already voided");
    }

    const voided = await tx.sale.update({
      where: { id, status: sale.status },
      data: { status: "VOIDED" },
      include: saleInclude,
    });
    return saleWithBalances(voided);
  });
}

export async function listPayments(saleId: string, params: ListPaymentsQuery) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true },
  });
  if (!sale) throw new AppError(404, "Sale not found");

  const { page, limit, order } = params;
  const where = { saleId };
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  return {
    data: serialize(payments),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function createPayment(
  saleId: string,
  input: CreatePaymentInput,
  actorId: string,
) {
  return serializable(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });
    if (!sale) throw new AppError(404, "Sale not found");
    if (sale.status === "VOIDED") {
      throw new AppError(409, "A voided sale cannot receive payments");
    }

    const amount = toPrismaDecimal(input.amount);
    const paid = paymentTotal(sale.payments);
    if (paid.add(amount).gt(sale.total)) {
      throw new AppError(409, "Payment exceeds the sale outstanding balance");
    }

    const payment = await tx.payment.create({
      data: {
        saleId,
        method: input.method,
        amount,
        reference: input.reference ?? null,
        actorId,
        paidAt: new Date(),
      },
    });
    await refreshSaleStatus(tx, saleId, sale.status);
    return {
      payment: serialize(payment),
      sale: await getSaleWithBalances(tx, saleId),
    };
  });
}

export async function updatePayment(
  saleId: string,
  paymentId: string,
  input: UpdatePaymentInput,
) {
  return serializable(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });
    if (!sale) throw new AppError(404, "Sale not found");
    if (sale.status === "VOIDED") {
      throw new AppError(409, "Payments on a voided sale cannot be edited");
    }
    const payment = sale.payments.find((item) => item.id === paymentId);
    if (!payment) throw new AppError(404, "Payment not found");

    const amount = input.amount
      ? toPrismaDecimal(input.amount)
      : payment.amount;
    const totalAfterUpdate = paymentTotal(sale.payments)
      .sub(payment.amount)
      .add(amount);
    if (totalAfterUpdate.gt(sale.total)) {
      throw new AppError(409, "Payment exceeds the sale outstanding balance");
    }

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        ...(input.amount !== undefined ? { amount } : {}),
        ...(input.method !== undefined ? { method: input.method } : {}),
        ...(input.reference !== undefined
          ? { reference: input.reference }
          : {}),
      },
    });
    await refreshSaleStatus(tx, saleId, sale.status);
    return {
      payment: serialize(updated),
      sale: await getSaleWithBalances(tx, saleId),
    };
  });
}

export async function deletePayment(saleId: string, paymentId: string) {
  return serializable(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { payments: true },
    });
    if (!sale) throw new AppError(404, "Sale not found");
    if (sale.status === "VOIDED") {
      throw new AppError(409, "Payments on a voided sale cannot be deleted");
    }
    const payment = sale.payments.find((item) => item.id === paymentId);
    if (!payment) throw new AppError(404, "Payment not found");

    await tx.payment.delete({ where: { id: paymentId } });
    await refreshSaleStatus(tx, saleId, sale.status);
    return {
      payment: serialize(payment),
      sale: await getSaleWithBalances(tx, saleId),
    };
  });
}
