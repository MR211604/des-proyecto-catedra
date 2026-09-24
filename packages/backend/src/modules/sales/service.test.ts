import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";

const {
  transaction,
  customerOrderFindUnique,
  saleFindUnique,
  saleCreate,
  saleUpdate,
  paymentCreate,
  paymentUpdate,
  paymentDelete,
} = vi.hoisted(() => ({
  transaction: vi.fn(),
  customerOrderFindUnique: vi.fn(),
  saleFindUnique: vi.fn(),
  saleCreate: vi.fn(),
  saleUpdate: vi.fn(),
  paymentCreate: vi.fn(),
  paymentUpdate: vi.fn(),
  paymentDelete: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    $transaction: transaction,
    customerOrder: { findUnique: customerOrderFindUnique },
    sale: {
      findUnique: saleFindUnique,
      create: saleCreate,
      update: saleUpdate,
    },
    payment: {
      create: paymentCreate,
      update: paymentUpdate,
      delete: paymentDelete,
    },
  },
}));

const { createSale, createPayment, updatePayment, deletePayment } =
  await import("./service.js");

const order = {
  id: "order_1",
  items: [
    {
      id: "order_item_1",
      description: "Ajuste de manga",
      quantity: new Prisma.Decimal("2.500"),
      unitPrice: new Prisma.Decimal("10.00"),
    },
    {
      id: "order_item_2",
      description: "Cambio de cierre",
      quantity: new Prisma.Decimal("1"),
      unitPrice: new Prisma.Decimal("15.00"),
    },
  ],
};

const sale = {
  id: "sale_1",
  number: 1,
  orderId: "order_1",
  status: "OPEN" as const,
  subtotal: new Prisma.Decimal("40.00"),
  total: new Prisma.Decimal("40.00"),
  items: [],
  payments: [],
  order: { id: "order_1", client: { id: "client_1", name: "Ana" } },
};

const payment = {
  id: "payment_1",
  saleId: "sale_1",
  method: "CASH" as const,
  amount: new Prisma.Decimal("40.00"),
  paidAt: new Date("2026-09-24T10:00:00.000Z"),
  reference: null,
  actorId: "user_1",
};

const tx = {
  customerOrder: { findUnique: customerOrderFindUnique },
  sale: { findUnique: saleFindUnique, create: saleCreate, update: saleUpdate },
  payment: {
    create: paymentCreate,
    update: paymentUpdate,
    delete: paymentDelete,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation(
    async (callback: (client: typeof tx) => unknown) => callback(tx),
  );
  customerOrderFindUnique.mockResolvedValue(order);
  saleCreate.mockResolvedValue(sale);
  saleUpdate.mockResolvedValue(sale);
  paymentCreate.mockResolvedValue(payment);
  paymentUpdate.mockResolvedValue(payment);
  paymentDelete.mockResolvedValue(payment);
});

describe("sales service persistence boundary", () => {
  it("copies order items and calculates sale totals in the backend", async () => {
    await expect(createSale({ orderId: "order_1" })).resolves.toMatchObject({
      subtotal: "40",
      total: "40",
    });

    const createCall = saleCreate.mock.calls[0]?.[0];
    expect(createCall.data.items.create).toEqual([
      {
        description: "Ajuste de manga",
        quantity: new Prisma.Decimal("2.500"),
        unitPrice: new Prisma.Decimal("10.00"),
        total: new Prisma.Decimal("25.00"),
      },
      {
        description: "Cambio de cierre",
        quantity: new Prisma.Decimal("1"),
        unitPrice: new Prisma.Decimal("15.00"),
        total: new Prisma.Decimal("15.00"),
      },
    ]);
    expect(transaction.mock.calls[0]?.[1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("rejects an order without items", async () => {
    customerOrderFindUnique.mockResolvedValue({ ...order, items: [] });

    await expect(createSale({ orderId: "order_1" })).rejects.toEqual(
      new AppError(409, "An order without items cannot have a sale"),
    );
    expect(saleCreate).not.toHaveBeenCalled();
  });

  it("records a payment, stores its actor, and marks an exact payment as paid", async () => {
    const paymentSale = { ...sale, payments: [] };
    const refreshedSale = { ...sale, status: "PAID", payments: [payment] };
    saleFindUnique
      .mockResolvedValueOnce(paymentSale)
      .mockResolvedValueOnce(refreshedSale)
      .mockResolvedValueOnce(refreshedSale);

    await expect(
      createPayment("sale_1", { amount: "40.00", method: "CASH" }, "user_1"),
    ).resolves.toMatchObject({
      payment: { id: "payment_1", amount: "40" },
      sale: { paidAmount: "40", outstandingBalance: "0" },
    });

    expect(paymentCreate).toHaveBeenCalledWith({
      data: {
        saleId: "sale_1",
        method: "CASH",
        amount: new Prisma.Decimal("40.00"),
        reference: null,
        actorId: "user_1",
        paidAt: expect.any(Date),
      },
    });
    expect(saleUpdate).toHaveBeenCalledWith({
      where: { id: "sale_1", status: "OPEN" },
      data: { status: "PAID" },
    });
  });

  it("rejects a payment that exceeds the outstanding balance", async () => {
    saleFindUnique.mockResolvedValue({
      ...sale,
      payments: [{ ...payment, amount: new Prisma.Decimal("35.00") }],
    });

    await expect(
      createPayment("sale_1", { amount: "10.00", method: "CASH" }, "user_1"),
    ).rejects.toEqual(
      new AppError(409, "Payment exceeds the sale outstanding balance"),
    );
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it("keeps paidAt immutable while editing a payment", async () => {
    const existing = {
      ...sale,
      status: "PAID" as const,
      payments: [payment],
    };
    saleFindUnique
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce({
        ...existing,
        payments: [{ ...payment, amount: new Prisma.Decimal("20.00") }],
      })
      .mockResolvedValueOnce({
        ...existing,
        status: "OPEN",
        payments: [{ ...payment, amount: new Prisma.Decimal("20.00") }],
      });

    await updatePayment("sale_1", "payment_1", {
      amount: "20.00",
      method: "TRANSFER",
      reference: "transfer-1",
    });

    expect(paymentUpdate).toHaveBeenCalledWith({
      where: { id: "payment_1" },
      data: {
        amount: new Prisma.Decimal("20.00"),
        method: "TRANSFER",
        reference: "transfer-1",
      },
    });
    expect(paymentUpdate.mock.calls[0]?.[0].data).not.toHaveProperty("paidAt");
  });

  it("does not allow payment changes on a voided sale", async () => {
    saleFindUnique.mockResolvedValue({ ...sale, status: "VOIDED" });

    await expect(deletePayment("sale_1", "payment_1")).rejects.toEqual(
      new AppError(409, "Payments on a voided sale cannot be deleted"),
    );
    expect(paymentDelete).not.toHaveBeenCalled();
  });
});
