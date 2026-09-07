import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../../generated/prisma/client.js";

const { stageFindMany, jobFindUnique, eventFindMany } = vi.hoisted(() => ({
  stageFindMany: vi.fn(),
  jobFindUnique: vi.fn(),
  eventFindMany: vi.fn(),
}));

vi.mock("../../db/prisma.js", () => ({
  prisma: {
    productionStage: { findMany: stageFindMany },
    productionJob: { findUnique: jobFindUnique },
    productionEvent: { findMany: eventFindMany },
  },
}));

const { getProductionBoard, getProductionJob, listProductionEvents } =
  await import("./service.js");

const stage = {
  id: "stage_1",
  name: "Preparacion",
  position: 1,
  isActive: true,
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-01T10:00:00.000Z"),
};
const job = {
  id: "job_1",
  orderId: "order_1",
  orderItemId: "item_1",
  stageId: "stage_1",
  description: "Vestido",
  status: "TODO",
  assignedTo: "user_1",
  dueDate: new Date("2026-09-10T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
  updatedAt: new Date("2026-09-01T10:00:00.000Z"),
  stage,
  orderItem: {
    id: "item_1",
    orderId: "order_1",
    description: "Vestido",
    quantity: new Prisma.Decimal("1.000"),
    unitPrice: new Prisma.Decimal("25.00"),
    total: new Prisma.Decimal("25.00"),
    specifications: null,
    createdAt: new Date("2026-09-01T10:00:00.000Z"),
  },
  order: {
    id: "order_1",
    number: 4,
    status: "IN_PRODUCTION",
    dueDate: new Date("2026-09-12T00:00:00.000Z"),
    client: { id: "client_1", name: "Ana", phone: null, email: null },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  stageFindMany.mockReset();
  jobFindUnique.mockReset();
  eventFindMany.mockReset();
});

describe("production read service", () => {
  it("returns ordered active and historical columns with exact serialization", async () => {
    stageFindMany.mockResolvedValue([
      { ...stage, isActive: false, position: 1, jobs: [job] },
      { ...stage, id: "stage_2", position: 2, jobs: [] },
    ]);

    await expect(
      getProductionBoard({ orderId: "order_1", status: "TODO", assignedTo: "user_1" }),
    ).resolves.toMatchObject([
      {
        id: "stage_1",
        isHistorical: true,
        jobs: [{ id: "job_1", dueDate: "2026-09-10T00:00:00.000Z" }],
      },
      { id: "stage_2", isHistorical: false, jobs: [] },
    ]);

    expect(stageFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { position: "asc" } }),
    );
    expect(stageFindMany.mock.calls[0]?.[0].include.jobs.where).toEqual({
      orderId: "order_1",
      status: "TODO",
      assignedTo: "user_1",
    });
  });

  it("enriches a job and rejects unknown jobs", async () => {
    jobFindUnique.mockResolvedValueOnce(job).mockResolvedValueOnce(null);

    await expect(getProductionJob("job_1")).resolves.toMatchObject({
      id: "job_1",
      order: { client: { name: "Ana" } },
      orderItem: { quantity: "1" },
    });
    await expect(getProductionJob("missing")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns events in the persistence order with stage context", async () => {
    jobFindUnique.mockResolvedValue({ id: "job_1" });
    eventFindMany.mockResolvedValue([
      {
        id: "event_1",
        jobId: "job_1",
        fromStageId: null,
        toStageId: "stage_1",
        actorId: "user_1",
        notes: "Inicio",
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
        fromStage: null,
        toStage: stage,
      },
    ]);

    await expect(listProductionEvents("job_1")).resolves.toMatchObject([
      {
        actorId: "user_1",
        notes: "Inicio",
        createdAt: "2026-09-01T10:00:00.000Z",
        toStage: { name: "Preparacion" },
      },
    ]);
    expect(eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobId: "job_1" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );
  });
});
