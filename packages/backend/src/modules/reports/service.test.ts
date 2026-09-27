import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";

const {
  orderFindMany,
  jobFindMany,
  stageFindMany,
  eventFindMany,
  clientFindMany,
  inventoryItemFindMany,
  movementFindMany,
} = vi.hoisted(() => ({
  orderFindMany: vi.fn(),
  jobFindMany: vi.fn(),
  stageFindMany: vi.fn(),
  eventFindMany: vi.fn(),
  clientFindMany: vi.fn(),
  inventoryItemFindMany: vi.fn(),
  movementFindMany: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    customerOrder: { findMany: orderFindMany },
    productionJob: { findMany: jobFindMany },
    productionStage: { findMany: stageFindMany },
    productionEvent: { findMany: eventFindMany },
    client: { findMany: clientFindMany },
    inventoryItem: { findMany: inventoryItemFindMany },
    stockMovement: { findMany: movementFindMany },
  },
}));

const { clientsReport, inventoryReport, ordersReport, productionReport } =
  await import("./service.js");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesCondition(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== "object")
    return actual === expected;
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }
  if (!isRecord(expected)) return true;
  if (actual instanceof Date) {
    return Object.entries(expected).every(([operator, value]) => {
      if (!(value instanceof Date)) return true;
      if (operator === "gte") return actual >= value;
      if (operator === "gt") return actual > value;
      if (operator === "lte") return actual <= value;
      if (operator === "lt") return actual < value;
      return true;
    });
  }
  if (Array.isArray(actual)) {
    return Object.entries(expected).every(([operator, where]) => {
      if (operator === "some")
        return actual.some(
          (entry) =>
            isRecord(entry) && isRecord(where) && matchesWhere(entry, where),
        );
      if (operator === "none")
        return !actual.some(
          (entry) =>
            isRecord(entry) && isRecord(where) && matchesWhere(entry, where),
        );
      return true;
    });
  }
  if (isRecord(actual)) return matchesWhere(actual, expected);

  return Object.entries(expected).every(([operator, value]) => {
    if (operator === "gte")
      return actual instanceof Date && value instanceof Date && actual >= value;
    if (operator === "gt")
      return actual instanceof Date && value instanceof Date && actual > value;
    if (operator === "lte")
      return actual instanceof Date && value instanceof Date && actual <= value;
    if (operator === "lt")
      return actual instanceof Date && value instanceof Date && actual < value;
    if (operator === "in")
      return Array.isArray(value) && value.includes(actual);
    if (operator === "notIn")
      return Array.isArray(value) && !value.includes(actual);
    if (operator === "not") return !matchesCondition(actual, value);
    return true;
  });
}

function matchesWhere(
  row: Record<string, unknown>,
  where: Record<string, unknown>,
) {
  const and = where.AND;
  const or = where.OR;
  if (
    Array.isArray(and) &&
    !and.every(
      (condition) => isRecord(condition) && matchesWhere(row, condition),
    )
  ) {
    return false;
  }
  if (
    Array.isArray(or) &&
    !or.some((condition) => isRecord(condition) && matchesWhere(row, condition))
  ) {
    return false;
  }

  return Object.entries(where).every(([key, expected]) => {
    if (key === "AND" || key === "OR") return true;
    return matchesCondition(row[key], expected);
  });
}

const historicalOrderRows = [
  {
    id: "ready-overdue",
    number: 21,
    status: "READY",
    dueDate: new Date("2024-05-01T12:00:00.000Z"),
    deliveredAt: null,
    createdAt: new Date("2024-05-02T12:00:00.000Z"),
    client: { id: "client_1", name: "Ana" },
    items: [{ total: new Prisma.Decimal("125.00") }],
  },
  {
    id: "confirmed-overdue",
    number: 22,
    status: "CONFIRMED",
    dueDate: new Date("2024-05-01T12:00:00.000Z"),
    deliveredAt: null,
    createdAt: new Date("2024-05-03T12:00:00.000Z"),
    client: { id: "client_2", name: "Beatriz" },
    items: [{ total: new Prisma.Decimal("90.00") }],
  },
  {
    id: "ready-on-time",
    number: 23,
    status: "READY",
    dueDate: new Date("2027-05-01T12:00:00.000Z"),
    deliveredAt: null,
    createdAt: new Date("2024-05-04T12:00:00.000Z"),
    client: { id: "client_3", name: "Carla" },
    items: [{ total: new Prisma.Decimal("110.00") }],
  },
  {
    id: "cancelled-overdue",
    number: 24,
    status: "CANCELLED",
    dueDate: new Date("2024-04-01T12:00:00.000Z"),
    deliveredAt: null,
    createdAt: new Date("2024-05-05T12:00:00.000Z"),
    client: { id: "client_4", name: "Daniela" },
    items: [{ total: new Prisma.Decimal("80.00") }],
  },
  {
    id: "no-due-date",
    number: 25,
    status: "CONFIRMED",
    dueDate: null,
    deliveredAt: null,
    createdAt: new Date("2024-05-06T12:00:00.000Z"),
    client: { id: "client_5", name: "Elena" },
    items: [{ total: new Prisma.Decimal("60.00") }],
  },
];

const activeStages = [{ id: "stage_1", name: "Costura", position: 1 }];
const productionJobs = [
  {
    id: "job-in-progress",
    description: "Dobladillo",
    status: "IN_PROGRESS",
    assignedTo: "Ana",
    stage: activeStages[0],
    order: {
      id: "order_1",
      number: 21,
      status: "IN_PRODUCTION",
      dueDate: null,
      client: { id: "client_1", name: "Ana", phone: null, email: null },
    },
    dueDate: null,
    createdAt: new Date("2024-05-02T12:00:00.000Z"),
  },
  {
    id: "job-blocked",
    description: "Ajuste de manga",
    status: "BLOCKED",
    assignedTo: "Beatriz",
    stage: activeStages[0],
    order: {
      id: "order_2",
      number: 22,
      status: "IN_PRODUCTION",
      dueDate: null,
      client: { id: "client_2", name: "Beatriz", phone: null, email: null },
    },
    dueDate: null,
    createdAt: new Date("2024-05-03T12:00:00.000Z"),
  },
];
const clients = [
  {
    id: "client-with-activity",
    name: "Ana",
    createdAt: new Date("2024-05-02T12:00:00.000Z"),
    deletedAt: null,
    orders: [
      {
        id: "order_1",
        number: 21,
        status: "DELIVERED",
        createdAt: new Date("2024-05-04T12:00:00.000Z"),
      },
    ],
  },
  {
    id: "client-without-activity",
    name: "Beatriz",
    createdAt: new Date("2024-05-03T12:00:00.000Z"),
    deletedAt: null,
    orders: [],
  },
];
const inventoryItems = [
  {
    id: "item-low",
    name: "Tela de algodón",
    sku: "TEL-01",
    unit: "METER",
    quantity: new Prisma.Decimal("2.000"),
    reorderPoint: new Prisma.Decimal("5.000"),
    supplierId: "supplier_1",
    supplier: { id: "supplier_1", name: "Textiles Ana" },
    deletedAt: null,
  },
  {
    id: "item-sufficient",
    name: "Hilo de algodón",
    sku: "HIL-01",
    unit: "UNIT",
    quantity: new Prisma.Decimal("10.000"),
    reorderPoint: new Prisma.Decimal("3.000"),
    supplierId: "supplier_2",
    supplier: { id: "supplier_2", name: "Mercería Sur" },
    deletedAt: null,
  },
];
const stockMovements = inventoryItems.map((item, index) => ({
  id: `movement-${item.id}`,
  itemId: item.id,
  item: {
    id: item.id,
    name: item.name,
    unit: item.unit,
    deletedAt: null,
    supplierId: item.supplierId,
  },
  type: "ISSUE",
  quantity: new Prisma.Decimal("1.000"),
  unit: item.unit,
  reference: null,
  reason: null,
  actorId: "actor_1",
  createdAt: new Date(`2024-05-0${index + 2}T12:00:00.000Z`),
}));

beforeEach(() => {
  vi.clearAllMocks();
  orderFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      historicalOrderRows.filter((row) => matchesWhere(row, where)),
  );
  jobFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      productionJobs.filter((job) => matchesWhere(job, where)),
  );
  stageFindMany.mockResolvedValue(activeStages);
  eventFindMany.mockResolvedValue([]);
  clientFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      clients.filter((client) => matchesWhere(client, where)),
  );
  inventoryItemFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      inventoryItems.filter((item) => matchesWhere(item, where)),
  );
  movementFindMany.mockImplementation(
    async ({ where }: { where: Record<string, unknown> }) =>
      stockMovements.filter((movement) => matchesWhere(movement, where)),
  );
});

describe("reports service filters", () => {
  it("combines order status and overdue criteria", async () => {
    const report = await ordersReport({
      from: "2024-01-01",
      to: "2024-12-31",
      groupBy: "day",
      page: 1,
      limit: 20,
      status: "READY",
      overdue: true,
    });

    expect(report.data).toMatchObject([{ id: "ready-overdue" }]);
  });

  it("can select orders that are not overdue", async () => {
    const report = await ordersReport({
      from: "2024-01-01",
      to: "2024-12-31",
      groupBy: "day",
      page: 1,
      limit: 20,
      overdue: false,
    });

    expect(report.data).toMatchObject([
      { id: "ready-on-time" },
      { id: "cancelled-overdue" },
      { id: "no-due-date" },
    ]);
  });

  it("combines production status and blocked criteria", async () => {
    const report = await productionReport({
      from: "2024-01-01",
      to: "2024-12-31",
      groupBy: "day",
      page: 1,
      limit: 20,
      status: "IN_PROGRESS",
      blocked: true,
    });

    expect(report.data).toEqual([]);
  });

  it("can select clients without activity during the period", async () => {
    const report = await clientsReport({
      from: "2024-01-01",
      to: "2024-12-31",
      groupBy: "day",
      page: 1,
      limit: 20,
      withActivity: false,
    });

    expect(report.data).toMatchObject([{ id: "client-without-activity" }]);
  });

  it("applies material availability to matching inventory movements", async () => {
    const report = await inventoryReport({
      from: "2024-01-01",
      to: "2024-12-31",
      groupBy: "day",
      page: 1,
      limit: 20,
      availability: "low",
      movementType: "ISSUE",
    });

    expect(report.data).toMatchObject([{ id: "movement-item-low" }]);
  });
});
