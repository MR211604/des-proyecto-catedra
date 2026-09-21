import { prisma } from "../../db/prisma.js";
import { type $Enums, Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../middleware/errors.js";
import { type ActiveStage, deriveJobStatus } from "../production/service.js";
import { serialize, stateConflict, toPrismaDecimal } from "../utils.js";
import type { CreateOrderInput, ListOrdersQuery } from "./schema.js";

const orderInclude = {
  client: true,
  quote: true,
  items: { include: { materials: { include: { inventoryItem: true } } } },
  jobs: { include: { stage: true, events: true } },
} as const;

function orderData(input: CreateOrderInput) {
  const items = input.items.map((item) => ({
    description: item.description,
    quantity: toPrismaDecimal(item.quantity),
    unitPrice: toPrismaDecimal(item.unitPrice),
    total: toPrismaDecimal(item.quantity)
      .mul(toPrismaDecimal(item.unitPrice))
      .toDecimalPlaces(2),
    specifications: item.specifications as Prisma.InputJsonValue | undefined,
    materials: item.materials
      ? {
          create: item.materials.map((material) => ({
            inventoryItemId: material.inventoryItemId,
            quantity: toPrismaDecimal(material.quantity),
          })),
        }
      : undefined,
  }));

  return { items };
}

async function validateMaterials(tx: typeof prisma, input: CreateOrderInput) {
  const entries = input.items.flatMap((item, itemIndex) =>
    (item.materials ?? []).map((material) => ({ itemIndex, material })),
  );
  if (entries.length === 0) return;

  const inventoryIds = [
    ...new Set(entries.map(({ material }) => material.inventoryItemId)),
  ];
  const inventoryItems = await tx.inventoryItem.findMany({
    where: { id: { in: inventoryIds }, deletedAt: null },
    select: { id: true, unit: true },
  });
  const inventoryById = new Map(
    inventoryItems.map((inventoryItem) => [inventoryItem.id, inventoryItem]),
  );

  const seenPerItem = new Map<number, Set<string>>();
  for (const { itemIndex, material } of entries) {
    const inventoryItem = inventoryById.get(material.inventoryItemId);
    if (!inventoryItem) {
      throw new AppError(400, "Material not found or deactivated");
    }
    if (material.unit !== inventoryItem.unit) {
      throw new AppError(
        400,
        "Material unit does not match the inventory item unit",
      );
    }
    const seen = seenPerItem.get(itemIndex) ?? new Set<string>();
    if (seen.has(material.inventoryItemId)) {
      throw new AppError(400, "Duplicate material within the same order item");
    }
    seen.add(material.inventoryItemId);
    seenPerItem.set(itemIndex, seen);
  }
}

async function validateJobs(tx: typeof prisma, input: CreateOrderInput) {
  for (const job of input.jobs) {
    if (
      job.orderItemIndex !== undefined &&
      job.orderItemIndex >= input.items.length
    ) {
      throw new AppError(400, "Production job orderItemIndex is out of range");
    }
  }

  const stageIds = [...new Set(input.jobs.map((job) => job.stageId))];
  const activeStages = await tx.productionStage.findMany({
    where: { isActive: true },
    select: { id: true, position: true },
  });
  const activeStageIds = new Set(activeStages.map((stage) => stage.id));
  if (stageIds.some((stageId) => !activeStageIds.has(stageId))) {
    throw new AppError(404, "Active production stage not found");
  }
  return activeStages;
}

function jobData(
  input: CreateOrderInput,
  items: Array<{ id: string }>,
  activeStages: ActiveStage[],
) {
  return input.jobs.map((job) => ({
    stageId: job.stageId,
    orderItemId:
      job.orderItemIndex === undefined
        ? undefined
        : items[job.orderItemIndex]?.id,
    description: job.description,
    status: deriveJobStatus(
      activeStages.find((stage) => stage.id === job.stageId)?.position ?? -1,
      activeStages,
    ),
    assignedTo: job.assignedTo,
    dueDate: job.dueDate,
  }));
}

async function createJobs(
  tx: typeof prisma,
  orderId: string,
  input: CreateOrderInput,
  items: Array<{ id: string }>,
  activeStages: ActiveStage[],
) {
  await tx.productionJob.createMany({
    data: jobData(input, items, activeStages).map((job) => ({
      ...job,
      orderId,
    })),
  });
}

export async function createOrder(input: CreateOrderInput) {
  const data = orderData(input);
  return prisma.$transaction(
    async (tx) => {
      const client = await tx.client.findFirst({
        where: { id: input.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const activeStages = await validateJobs(tx as typeof prisma, input);
      await validateMaterials(tx as typeof prisma, input);

      const order = await tx.customerOrder.create({
        data: {
          clientId: input.clientId,
          dueDate: input.dueDate,
          notes: input.notes,
          items: { create: data.items },
        },
        include: { items: true },
      });

      // Creando trabajos de produccion
      await createJobs(
        tx as typeof prisma,
        order.id,
        input,
        order.items,
        activeStages,
      );

      const completeOrder = await tx.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: orderInclude,
      });

      return serialize(completeOrder);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function getOrderById(id: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!order) throw new AppError(404, "Order not found");
  return serialize(order);
}

export async function listOrders(params: ListOrdersQuery) {
  const { page, limit, status, clientId, search, sortBy, order } = params;
  const orderCode = search?.match(/^(?:ORD-?)?(\d+)$/i)?.[1];
  const quoteCode = search?.match(/^COT-?(\d+)$/i)?.[1];
  const orderNumber = orderCode ? Number(orderCode) : undefined;
  const quoteNumber = quoteCode ? Number(quoteCode) : undefined;
  const searchConditions = search
    ? [
        ...(orderNumber === undefined ? [] : [{ number: orderNumber }]),
        { notes: { contains: search, mode: "insensitive" as const } },
        {
          client: { name: { contains: search, mode: "insensitive" as const } },
        },
        {
          ...(quoteNumber === undefined
            ? { quote: { number: -1 } }
            : { quote: { number: quoteNumber } }),
        },
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
  const [orders, total] = await Promise.all([
    prisma.customerOrder.findMany({
      where,
      include: orderInclude,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customerOrder.count({ where }),
  ]);
  return {
    data: serialize(orders),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateOrder(id: string, input: CreateOrderInput) {
  const data = orderData(input);
  return prisma.$transaction(
    async (tx) => {
      const before = await tx.customerOrder.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!before) throw new AppError(404, "Order not found");
      if (before.status !== "CONFIRMED") {
        throw new AppError(409, "Only confirmed orders can be updated");
      }
      if (
        before.jobs.some(
          (job) => job.status !== "TODO" || job.events.length > 0,
        )
      ) {
        throw new AppError(
          409,
          "Orders with production activity cannot be updated",
        );
      }
      const client = await tx.client.findFirst({
        where: { id: input.clientId, deletedAt: null },
      });
      if (!client) throw new AppError(404, "Active client not found");
      const activeStages = await validateJobs(tx as typeof prisma, input);
      await validateMaterials(tx as typeof prisma, input);

      await tx.productionJob.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      const updated = await tx.customerOrder.update({
        where: { id },
        data: {
          clientId: input.clientId,
          dueDate: input.dueDate,
          notes: input.notes,
          items: { create: data.items },
        },
        include: { items: true },
      });
      await createJobs(
        tx as typeof prisma,
        id,
        input,
        updated.items,
        activeStages,
      );
      const completeOrder = await tx.customerOrder.findUniqueOrThrow({
        where: { id },
        include: orderInclude,
      });

      return serialize(completeOrder);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deleteOrder(id: string) {
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!order) throw new AppError(404, "Order not found");
      if (order.status !== "CONFIRMED") {
        throw new AppError(409, "Only confirmed orders can be deleted");
      }
      await tx.customerOrder.delete({ where: { id } });
      return { id, deleted: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function issueMaterialsForStart(
  tx: typeof prisma,
  items: Array<{
    id: string;
    materials: Array<{
      inventoryItemId: string;
      quantity: Prisma.Decimal;
    }>;
  }>,
  actorId: string,
) {
  const entries = items.flatMap((item) =>
    item.materials.map((material) => ({ orderItemId: item.id, material })),
  );
  if (entries.length === 0) return;

  const inventoryIds = [
    ...new Set(entries.map(({ material }) => material.inventoryItemId)),
  ];
  const inventoryItems = await tx.inventoryItem.findMany({
    where: { id: { in: inventoryIds }, deletedAt: null },
  });
  const inventoryById = new Map(
    inventoryItems.map((inventoryItem) => [inventoryItem.id, inventoryItem]),
  );

  const requiredByItem = new Map<string, Prisma.Decimal>();
  for (const { material } of entries) {
    const current = requiredByItem.get(material.inventoryItemId);
    requiredByItem.set(
      material.inventoryItemId,
      (current ?? new Prisma.Decimal(0)).add(material.quantity),
    );
  }

  for (const [inventoryItemId, required] of requiredByItem) {
    const inventoryItem = inventoryById.get(inventoryItemId);
    if (!inventoryItem) {
      throw new AppError(409, "Material not found or deactivated");
    }
    if (inventoryItem.quantity.lessThan(required)) {
      throw new AppError(409, "Insufficient stock to start production");
    }
  }

  const runningQuantity = new Map(
    inventoryItems.map((inventoryItem) => [
      inventoryItem.id,
      inventoryItem.quantity,
    ]),
  );

  for (const { orderItemId, material } of entries) {
    const inventoryItem = inventoryById.get(material.inventoryItemId);
    if (!inventoryItem) {
      throw new AppError(409, "Material not found or deactivated");
    }
    await applyStockMovement(
      tx as typeof prisma,
      {
        itemId: material.inventoryItemId,
        orderItemId,
        type: "ISSUE",
        quantity: material.quantity,
        unit: inventoryItem.unit,
        reason: "production",
        actorId,
      },
      inventoryById,
      runningQuantity,
    );
  }
}

async function applyStockMovement(
  tx: typeof prisma,
  entry: {
    itemId: string;
    orderItemId: string | null;
    type: "ISSUE" | "RETURN";
    quantity: Prisma.Decimal;
    unit: $Enums.UnitOfMeasure;
    reason: string;
    actorId: string;
  },
  inventoryById: ReadonlyMap<string, { id: string; quantity: Prisma.Decimal }>,
  runningQuantity: Map<string, Prisma.Decimal>,
) {
  const inventoryItem = inventoryById.get(entry.itemId);
  if (!inventoryItem) {
    throw new AppError(409, "Material not found or deactivated");
  }
  const running = runningQuantity.get(entry.itemId) ?? inventoryItem.quantity;
  const updated =
    entry.type === "ISSUE"
      ? running.sub(entry.quantity)
      : running.add(entry.quantity);
  runningQuantity.set(entry.itemId, updated);

  await tx.stockMovement.create({
    data: {
      itemId: entry.itemId,
      orderItemId: entry.orderItemId,
      type: entry.type,
      quantity: entry.quantity,
      unit: entry.unit,
      reference: null,
      reason: entry.reason,
      actorId: entry.actorId,
    },
  });

  await tx.inventoryItem.update({
    where: { id: entry.itemId },
    data: { quantity: updated },
  });
}

async function returnMaterialsForCancel(
  tx: typeof prisma,
  items: Array<{ id: string }>,
  actorId: string,
) {
  const orderItemIds = items.map((item) => item.id);
  if (orderItemIds.length === 0) return;

  const issuedMovements = await tx.stockMovement.findMany({
    where: { orderItemId: { in: orderItemIds }, type: "ISSUE" },
  });
  if (issuedMovements.length === 0) return;

  const inventoryIds = [
    ...new Set(issuedMovements.map((movement) => movement.itemId)),
  ];
  const inventoryItems = await tx.inventoryItem.findMany({
    where: { id: { in: inventoryIds } },
  });
  const inventoryById = new Map(
    inventoryItems.map((inventoryItem) => [inventoryItem.id, inventoryItem]),
  );
  const runningQuantity = new Map<string, Prisma.Decimal>();

  for (const movement of issuedMovements) {
    await applyStockMovement(
      tx as typeof prisma,
      {
        itemId: movement.itemId,
        orderItemId: movement.orderItemId,
        type: "RETURN",
        quantity: movement.quantity,
        unit: movement.unit,
        reason: "cancellation",
        actorId,
      },
      inventoryById,
      runningQuantity,
    );
  }
}

async function transitionOrder(
  id: string,
  actorId: string,
  operation: "start" | "ready" | "deliver" | "cancel",
) {
  return prisma
    .$transaction(
      async (tx) => {
        const before = await tx.customerOrder.findUnique({
          where: { id },
          include: orderInclude,
        });
        if (!before) throw new AppError(404, "Order not found");

        let toStatus: "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";
        if (operation === "start") {
          if (before.status !== "CONFIRMED") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to IN_PRODUCTION`,
            );
          }
          toStatus = "IN_PRODUCTION";
          await issueMaterialsForStart(
            tx as typeof prisma,
            before.items,
            actorId,
          );
        } else if (operation === "ready") {
          if (before.status !== "IN_PRODUCTION") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to READY`,
            );
          }
          if (before.jobs.some((job) => job.status !== "COMPLETED")) {
            throw new AppError(
              409,
              "All production jobs must be completed before the order is ready",
            );
          }
          toStatus = "READY";
        } else if (operation === "deliver") {
          if (before.status !== "READY") {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to DELIVERED`,
            );
          }
          toStatus = "DELIVERED";
        } else {
          if (
            !["CONFIRMED", "IN_PRODUCTION", "READY"].includes(before.status)
          ) {
            throw new AppError(
              409,
              `Order cannot transition from ${before.status} to CANCELLED`,
            );
          }
          toStatus = "CANCELLED";
          await returnMaterialsForCancel(
            tx as typeof prisma,
            before.items,
            actorId,
          );
        }

        const after = await tx.customerOrder.update({
          where: { id, status: before.status },
          data: {
            status: toStatus,
            ...(operation === "start" ? { lockedAt: new Date() } : {}),
            ...(operation === "deliver" ? { deliveredAt: new Date() } : {}),
          },
          include: orderInclude,
        });
        return serialize(after);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch(stateConflict);
}

export function startOrderProduction(id: string, actorId: string) {
  return transitionOrder(id, actorId, "start");
}

export function markOrderReady(id: string, actorId: string) {
  return transitionOrder(id, actorId, "ready");
}

export function deliverOrder(id: string, actorId: string) {
  return transitionOrder(id, actorId, "deliver");
}

export function cancelOrder(id: string, actorId: string) {
  return transitionOrder(id, actorId, "cancel");
}
