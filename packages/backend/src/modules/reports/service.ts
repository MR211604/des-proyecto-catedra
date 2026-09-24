import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import { serialize } from "../utils.js";
import {
  dateGroupKey,
  resolveReportPeriod,
  type ReportPeriod,
} from "./time.js";
import type {
  AnyReportQuery,
  ClientsReportQuery,
  InventoryReportQuery,
  OrdersReportQuery,
  PaymentsReportQuery,
  ProductionReportQuery,
  QuotesReportQuery,
  SalesReportQuery,
  SummaryReportQuery,
} from "./schema.js";

const moneyZero = () => new Prisma.Decimal(0);

function sumDecimal(values: Array<Prisma.Decimal | null | undefined>) {
  return values.reduce<Prisma.Decimal>(
    (sum, value) => sum.add(value ?? moneyZero()),
    moneyZero(),
  );
}

function reportEnvelope(period: ReportPeriod, data: unknown) {
  return {
    period: {
      from: period.fromDate,
      to: period.toDate,
      timezone: period.timezone,
    },
    generatedAt: new Date().toISOString(),
    currency: "USD",
    data: serialize(data),
  };
}

function paginated<T>(
  period: ReportPeriod,
  rows: T[],
  total: number,
  query: AnyReportQuery,
  summary: unknown,
  groups: unknown[],
) {
  return {
    period: {
      from: period.fromDate,
      to: period.toDate,
      timezone: period.timezone,
    },
    generatedAt: new Date().toISOString(),
    currency: "USD",
    filters: serialize(query),
    summary: serialize(summary),
    groups: serialize(groups),
    data: serialize(rows),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

function pageRows<T>(rows: T[], query: { page: number; limit: number }) {
  return rows.slice((query.page - 1) * query.limit, query.page * query.limit);
}

function groupByDate<
  T extends { date: Date; amount?: Prisma.Decimal; count?: number },
>(rows: T[], groupBy: "day" | "week" | "month") {
  const groups = new Map<
    string,
    { key: string; count: number; amount: Prisma.Decimal }
  >();
  for (const row of rows) {
    const key = dateGroupKey(row.date, groupBy);
    const current = groups.get(key) ?? { key, count: 0, amount: moneyZero() };
    current.count += row.count ?? 1;
    current.amount = current.amount.add(row.amount ?? moneyZero());
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function orderTotal(
  items: Array<{ total: Prisma.Decimal | null | undefined }>,
) {
  return sumDecimal(items.map((item) => item.total));
}

function isOverdue(dueDate: Date | null, status: string, now = new Date()) {
  return Boolean(
    dueDate &&
      dueDate < now &&
      status !== "DELIVERED" &&
      status !== "CANCELLED",
  );
}

async function orderRows(query: OrdersReportQuery, period: ReportPeriod) {
  const where: Prisma.CustomerOrderWhereInput = {
    createdAt: { gte: period.from, lt: period.to },
    ...(query.status ? { status: query.status } : {}),
    ...(query.clientId ? { clientId: query.clientId } : {}),
    ...(query.overdue
      ? {
          dueDate: { lt: new Date() },
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        }
      : {}),
  };
  const rows = await prisma.customerOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      items: { select: { total: true } },
    },
  });
  return rows.map((order) => ({
    id: order.id,
    number: order.number,
    client: order.client,
    status: order.status,
    dueDate: order.dueDate,
    deliveredAt: order.deliveredAt,
    total: orderTotal(order.items),
    overdue: isOverdue(order.dueDate, order.status),
    date: order.createdAt,
  }));
}

export async function ordersReport(query: OrdersReportQuery) {
  const period = resolveReportPeriod(query);
  const rows = await orderRows(query, period);
  const statusCounts = Object.fromEntries(
    ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"].map(
      (status) => [status, rows.filter((row) => row.status === status).length],
    ),
  );
  const groups = groupByDate(rows, query.groupBy);
  return paginated(
    period,
    pageRows(rows, query),
    rows.length,
    query,
    {
      total: rows.length,
      overdue: rows.filter((row) => row.overdue).length,
      byStatus: statusCounts,
      totalValue: orderTotal(rows),
    },
    groups,
  );
}

async function salesRows(query: SalesReportQuery, period: ReportPeriod) {
  const rows = await prisma.sale.findMany({
    where: {
      createdAt: { gte: period.from, lt: period.to },
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: { number: true, client: { select: { id: true, name: true } } },
      },
      payments: { select: { amount: true } },
    },
  });
  return rows.map((sale) => ({
    id: sale.id,
    number: sale.number,
    status: sale.status,
    orderNumber: sale.order.number,
    client: sale.order.client,
    subtotal: sale.subtotal,
    total: sale.total,
    paidAmount: sumDecimal(sale.payments.map((payment) => payment.amount)),
    outstandingBalance:
      sale.status === "VOIDED"
        ? moneyZero()
        : sale.total.sub(
            sumDecimal(sale.payments.map((payment) => payment.amount)),
          ),
    date: sale.createdAt,
  }));
}

export async function salesReport(query: SalesReportQuery) {
  const period = resolveReportPeriod(query);
  const [rows, periodPayments] = await Promise.all([
    salesRows(query, period),
    prisma.payment.findMany({
      where: {
        paidAt: { gte: period.from, lt: period.to },
        sale: { status: { not: "VOIDED" } },
      },
      select: { amount: true, method: true },
    }),
  ]);
  const activeRows = rows.filter((row) => row.status !== "VOIDED");
  return paginated(
    period,
    pageRows(rows, query),
    rows.length,
    query,
    {
      totalSales: activeRows.length,
      totalSold: sumDecimal(activeRows.map((row) => row.total)),
      totalCollected: sumDecimal(
        periodPayments.map((payment) => payment.amount),
      ),
      outstandingBalance: sumDecimal(
        activeRows.map((row) => row.outstandingBalance),
      ),
      voidedSales: rows.filter((row) => row.status === "VOIDED").length,
      byPaymentMethod: Object.fromEntries(
        ["CASH", "TRANSFER"].map((method) => [
          method,
          sumDecimal(
            periodPayments
              .filter((payment) => payment.method === method)
              .map((payment) => payment.amount),
          ),
        ]),
      ),
    },
    groupByDate(
      activeRows.map((row) => ({ date: row.date, amount: row.total })),
      query.groupBy,
    ),
  );
}

export async function paymentsReport(query: PaymentsReportQuery) {
  const period = resolveReportPeriod(query);
  const rows = await prisma.payment.findMany({
    where: {
      paidAt: { gte: period.from, lt: period.to },
      ...(query.method ? { method: query.method } : {}),
      ...(query.saleId ? { saleId: query.saleId } : {}),
      sale: { status: { not: "VOIDED" } },
    },
    orderBy: { paidAt: "desc" },
    include: {
      sale: {
        select: {
          number: true,
          order: {
            select: {
              number: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
  const groups = groupByDate(
    rows.map((row) => ({ date: row.paidAt, amount: row.amount })),
    query.groupBy,
  );
  const byMethod = Object.fromEntries(
    ["CASH", "TRANSFER"].map((method) => [
      method,
      sumDecimal(
        rows.filter((row) => row.method === method).map((row) => row.amount),
      ),
    ]),
  );
  return paginated(
    period,
    pageRows(rows, query),
    rows.length,
    query,
    {
      totalPayments: rows.length,
      totalCollected: sumDecimal(rows.map((row) => row.amount)),
      byMethod,
    },
    groups,
  );
}

async function productionRows(query: ProductionReportQuery) {
  const rows = await prisma.productionJob.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.blocked === undefined
        ? {}
        : { status: query.blocked ? "BLOCKED" : { not: "BLOCKED" } }),
      order: { status: { in: ["IN_PRODUCTION", "READY"] } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    include: {
      stage: { select: { id: true, name: true, position: true } },
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          dueDate: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });
  return rows.map((job) => ({
    id: job.id,
    description: job.description,
    status: job.status,
    assignedTo: job.assignedTo,
    stage: job.stage,
    order: job.order,
    dueDate: job.dueDate,
    date: job.createdAt,
    createdAt: job.createdAt,
  }));
}

function durationMinutes(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 60_000;
}

function timingForJob(
  job: { createdAt: Date },
  events: Array<{
    type: string;
    createdAt: Date;
    toStage: { position: number };
  }>,
  finalPosition: number,
) {
  let blockedAt: Date | undefined;
  let blockedMinutes = 0;
  let completedAt: Date | undefined;
  for (const event of events) {
    if (event.type === "BLOCKED") blockedAt = event.createdAt;
    if (event.type === "UNBLOCKED" && blockedAt) {
      blockedMinutes += durationMinutes(blockedAt, event.createdAt);
      blockedAt = undefined;
    }
    if (
      event.type === "STAGE_MOVED" &&
      event.toStage.position === finalPosition &&
      !completedAt
    ) {
      completedAt = event.createdAt;
    }
  }
  if (!completedAt) return null;
  const totalMinutes = durationMinutes(job.createdAt, completedAt);
  return {
    totalMinutes,
    blockedMinutes,
    activeMinutes: Math.max(0, totalMinutes - blockedMinutes),
  };
}

export async function productionReport(query: ProductionReportQuery) {
  const period = resolveReportPeriod(query);
  const [rows, stages, events] = await Promise.all([
    productionRows(query),
    prisma.productionStage.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, position: true },
    }),
    prisma.productionEvent.findMany({
      where: { createdAt: { gte: period.from, lt: period.to } },
      include: { toStage: { select: { position: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const grouped = Object.values(
    rows.reduce<
      Record<string, { stage: unknown; status: string; count: number }>
    >((result, row) => {
      const key = `${row.stage.id}:${row.status}`;
      result[key] ??= { stage: row.stage, status: row.status, count: 0 };
      result[key].count += 1;
      return result;
    }, {}),
  );
  const finalPosition = stages.at(-1)?.position;
  const jobIds = rows.map((row) => row.id);
  const allEvents = finalPosition
    ? await prisma.productionEvent.findMany({
        where: { jobId: { in: jobIds } },
        include: { toStage: { select: { position: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const timings = finalPosition
    ? rows
        .map((row) =>
          timingForJob(
            row,
            allEvents.filter((event) => event.jobId === row.id),
            finalPosition,
          ),
        )
        .filter(
          (timing): timing is NonNullable<typeof timing> => timing !== null,
        )
    : [];
  // Open blocked intervals are intentionally excluded from averages: there is
  // no completed duration until a matching UNBLOCKED event exists.
  const average = (key: "totalMinutes" | "activeMinutes" | "blockedMinutes") =>
    timings.length
      ? timings.reduce((sum, timing) => sum + timing[key], 0) / timings.length
      : null;
  return paginated(
    period,
    pageRows(rows, query),
    rows.length,
    query,
    {
      currentJobs: rows.length,
      blockedJobs: rows.filter((row) => row.status === "BLOCKED").length,
      eventsInPeriod: events.length,
      eventTypes: Object.fromEntries(
        ["STAGE_MOVED", "BLOCKED", "UNBLOCKED"].map((type) => [
          type,
          events.filter((event) => event.type === type).length,
        ]),
      ),
      completedJobsWithTiming: timings.length,
      averageTotalMinutes: average("totalMinutes"),
      averageActiveMinutes: average("activeMinutes"),
      averageBlockedMinutes: average("blockedMinutes"),
    },
    grouped,
  );
}

function availability(quantity: Prisma.Decimal, reorderPoint: Prisma.Decimal) {
  if (quantity.lte(0)) return "out" as const;
  if (quantity.lte(reorderPoint)) return "low" as const;
  return "sufficient" as const;
}

export async function inventoryReport(query: InventoryReportQuery) {
  const period = resolveReportPeriod(query);
  const itemWhere = {
    deletedAt: null,
    ...(query.unit ? { unit: query.unit } : {}),
    ...(query.itemId ? { id: query.itemId } : {}),
    ...(query.supplierId ? { supplierId: query.supplierId } : {}),
  };
  const items = await prisma.inventoryItem.findMany({
    where: itemWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      unit: true,
      quantity: true,
      reorderPoint: true,
      supplier: { select: { id: true, name: true } },
    },
  });
  const filteredItems = items.filter(
    (item) =>
      !query.availability ||
      availability(item.quantity, item.reorderPoint) === query.availability,
  );
  const movements = await prisma.stockMovement.findMany({
    where: {
      createdAt: { gte: period.from, lt: period.to },
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.movementType ? { type: query.movementType } : {}),
      item: {
        deletedAt: null,
        ...(query.unit ? { unit: query.unit } : {}),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    include: { item: { select: { id: true, name: true, unit: true } } },
  });
  const rows = filteredItems.map((item) => ({
    ...item,
    availability: availability(item.quantity, item.reorderPoint),
  }));
  const movementRows = movements.map((movement) => ({
    id: movement.id,
    item: movement.item,
    type: movement.type,
    quantity: movement.quantity,
    unit: movement.unit,
    reference: movement.reference,
    reason: movement.reason,
    actorId: movement.actorId,
    createdAt: movement.createdAt,
  }));
  const reportRows: unknown[] = query.movementType ? movementRows : rows;
  return paginated(
    period,
    pageRows(reportRows, query),
    reportRows.length,
    query,
    {
      totalMaterials: rows.length,
      lowMaterials: rows.filter((item) => item.availability === "low").length,
      depletedMaterials: rows.filter((item) => item.availability === "out")
        .length,
      movementCount: movements.length,
    },
    Object.values(
      movements.reduce<
        Record<
          string,
          { unit: string; count: number; quantity: Prisma.Decimal }
        >
      >((result, movement) => {
        const key = movement.unit;
        result[key] ??= {
          unit: movement.unit,
          count: 0,
          quantity: moneyZero(),
        };
        result[key].count += 1;
        result[key].quantity = result[key].quantity.add(movement.quantity);
        return result;
      }, {}),
    ),
  );
}

export async function clientsReport(query: ClientsReportQuery) {
  const period = resolveReportPeriod(query);
  const rows = await prisma.client.findMany({
    where: {
      ...(query.active === undefined
        ? {}
        : { deletedAt: query.active ? null : { not: null } }),
      ...(query.withActivity
        ? {
            orders: {
              some: { createdAt: { gte: period.from, lt: period.to } },
            },
          }
        : {}),
      createdAt: { gte: period.from, lt: period.to },
    },
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        where: { createdAt: { gte: period.from, lt: period.to } },
        select: { id: true, number: true, status: true },
      },
    },
  });
  const data = rows.map((client) => ({
    id: client.id,
    name: client.name,
    createdAt: client.createdAt,
    active: client.deletedAt === null,
    orderCount: client.orders.length,
    orderIds: client.orders.map((order) => order.id),
  }));
  return paginated(
    period,
    pageRows(data, query),
    data.length,
    query,
    {
      newClients: data.length,
      activeWithActivity: data.filter(
        (client) => client.active && client.orderCount > 0,
      ).length,
    },
    groupByDate(
      rows.map((row) => ({ date: row.createdAt, count: 1 })),
      query.groupBy,
    ),
  );
}

export async function quotesReport(query: QuotesReportQuery) {
  const period = resolveReportPeriod(query);
  const rows = await prisma.quote.findMany({
    where: {
      createdAt: { gte: period.from, lt: period.to },
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      order: { select: { id: true, number: true } },
    },
  });
  const data = rows.map((quote) => ({
    id: quote.id,
    number: quote.number,
    client: quote.client,
    status: quote.status,
    total: quote.total,
    converted: Boolean(quote.order),
    order: quote.order,
    createdAt: quote.createdAt,
  }));
  const filtered =
    query.converted === undefined
      ? data
      : data.filter((quote) => quote.converted === query.converted);
  const eligible = filtered.filter((quote) => quote.status !== "DRAFT");
  const byStatus = Object.fromEntries(
    ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((status) => [
      status,
      filtered.filter((quote) => quote.status === status).length,
    ]),
  );
  return paginated(
    period,
    pageRows(filtered, query),
    filtered.length,
    query,
    {
      total: filtered.length,
      eligible: eligible.length,
      converted: eligible.filter((quote) => quote.converted).length,
      conversionRate: eligible.length
        ? (eligible.filter((quote) => quote.converted).length /
            eligible.length) *
          100
        : null,
      byStatus,
    },
    groupByDate(
      filtered.map((quote) => ({ date: quote.createdAt, amount: quote.total })),
      query.groupBy,
    ),
  );
}

export async function summary(query: SummaryReportQuery) {
  const period = resolveReportPeriod(query);
  // Orders and production are current-state indicators. The selected period
  // applies to historical metrics below, as agreed for the consolidated view.
  const [orders, production, sales, payments, inventory, clients, quotes] =
    await Promise.all([
      prisma.customerOrder.findMany({
        select: { status: true, dueDate: true },
      }),
      prisma.productionJob.findMany({
        where: { order: { status: { in: ["IN_PRODUCTION", "READY"] } } },
        select: { status: true, stage: { select: { id: true, name: true } } },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: period.from, lt: period.to } },
        select: {
          status: true,
          total: true,
          payments: { select: { amount: true } },
        },
      }),
      prisma.payment.findMany({
        where: {
          paidAt: { gte: period.from, lt: period.to },
          sale: { status: { not: "VOIDED" } },
        },
        select: { amount: true, method: true },
      }),
      prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        select: { quantity: true, reorderPoint: true },
      }),
      prisma.client.findMany({
        where: {
          deletedAt: null,
          orders: { some: { createdAt: { gte: period.from, lt: period.to } } },
        },
        select: { id: true },
      }),
      prisma.quote.findMany({
        where: { createdAt: { gte: period.from, lt: period.to } },
        select: { status: true, order: { select: { id: true } } },
      }),
    ]);
  const activeSales = sales.filter((sale) => sale.status !== "VOIDED");
  return {
    ...reportEnvelope(period, {
      orders: {
        totalActive: orders.filter(
          (order) => !["DELIVERED", "CANCELLED"].includes(order.status),
        ).length,
        byStatus: Object.fromEntries(
          ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "CANCELLED"].map(
            (status) => [
              status,
              orders.filter((order) => order.status === status).length,
            ],
          ),
        ),
        overdue: orders.filter((order) =>
          isOverdue(order.dueDate, order.status),
        ).length,
        readyForDelivery: orders.filter((order) => order.status === "READY")
          .length,
      },
      production: {
        currentJobs: production.length,
        blockedJobs: production.filter((job) => job.status === "BLOCKED")
          .length,
        byStage: Object.values(
          production.reduce<Record<string, { stage: unknown; count: number }>>(
            (result, job) => {
              const key = job.stage.id;
              result[key] ??= { stage: job.stage, count: 0 };
              result[key].count += 1;
              return result;
            },
            {},
          ),
        ),
      },
      sales: {
        totalSold: sumDecimal(activeSales.map((sale) => sale.total)),
        totalCollected: sumDecimal(payments.map((payment) => payment.amount)),
        outstandingBalance: sumDecimal(
          activeSales.map((sale) =>
            sale.total.sub(
              sumDecimal(sale.payments.map((payment) => payment.amount)),
            ),
          ),
        ),
        byPaymentMethod: Object.fromEntries(
          ["CASH", "TRANSFER"].map((method) => [
            method,
            sumDecimal(
              payments
                .filter((payment) => payment.method === method)
                .map((payment) => payment.amount),
            ),
          ]),
        ),
      },
      inventory: {
        low: inventory.filter(
          (item) => item.quantity.gt(0) && item.quantity.lte(item.reorderPoint),
        ).length,
        depleted: inventory.filter((item) => item.quantity.lte(0)).length,
      },
      clients: { withActivity: clients.length },
      quotes: {
        total: quotes.length,
        accepted: quotes.filter((quote) => quote.status === "ACCEPTED").length,
        rejected: quotes.filter((quote) => quote.status === "REJECTED").length,
        converted: quotes.filter((quote) => Boolean(quote.order)).length,
      },
    }),
    filters: serialize(query),
  };
}
