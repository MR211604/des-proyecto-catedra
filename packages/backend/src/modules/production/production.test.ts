import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errors.js";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  orgRole: "org:member",
  userId: "user_1",
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () => (_request: unknown, _response: unknown, next: () => void) =>
      next(),
  getAuth: () => auth,
}));

vi.mock("./service.js", () => ({
  getProductionBoard: vi.fn(async () => [
    {
      id: "stage_1",
      name: "Preparacion",
      position: 1,
      isActive: true,
      isHistorical: false,
      jobs: [
        {
          id: "job_1",
          orderId: "order_1",
          orderItemId: "item_1",
          status: "IN_PROGRESS",
          assignedTo: "tailor_1",
          dueDate: "2026-09-10T00:00:00.000Z",
          order: { id: "order_1", client: { id: "client_1", name: "Ana" } },
          orderItem: { id: "item_1", description: "Vestido" },
        },
      ],
    },
  ]),
  getProductionJob: vi.fn(async () => ({
    id: "job_1",
    status: "IN_PROGRESS",
    stage: { id: "stage_1", name: "Preparacion" },
    order: { id: "order_1", client: { id: "client_1", name: "Ana" } },
    orderItem: { id: "item_1", description: "Vestido" },
    dueDate: "2026-09-10T00:00:00.000Z",
  })),
  listProductionEvents: vi.fn(async () => [
    { id: "event_1", fromStageId: null, toStageId: "stage_1" },
  ]),
  listStages: vi.fn(async () => [
    { id: "stage_1", name: "Preparacion", position: 1, isActive: true },
  ]),
  createStage: vi.fn(async (input) => ({ id: "stage_2", ...input })),
  updateStage: vi.fn(async (id, input) => ({ id, ...input })),
  moveJob: vi.fn(async (id, input, actorId) => ({ id, ...input, actorId })),
  blockJob: vi.fn(async (id, actorId) => ({ id, status: "BLOCKED", actorId })),
  unblockJob: vi.fn(async (id, actorId) => ({ id, status: "TODO", actorId })),
  updateJob: vi.fn(async (id, input, actorId) => ({ id, ...input, actorId })),
}));

const { productionRouter } = await import("./router.js");
const service = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/production", productionRouter);
  app.use(errorHandler);
  return app;
}

describe("Production stages HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("lists stages for an authorized workshop user", async () => {
    const response = await request(testApp()).get("/production/stages");

    expect(response.status).toBe(200);
    expect(response.body[0].position).toBe(1);
    expect(service.listStages).toHaveBeenCalledOnce();
  });

  it("reads the enriched board, job detail, and chronological history", async () => {
    const boardResponse = await request(testApp()).get(
      "/production/board?orderId=order_1&status=BLOCKED&assignedTo=tailor_1",
    );
    const jobResponse = await request(testApp()).get(
      "/production/jobs/job_1",
    );
    const eventsResponse = await request(testApp()).get(
      "/production/jobs/job_1/events",
    );

    expect(boardResponse.status).toBe(200);
    expect(boardResponse.body[0].isHistorical).toBe(false);
    expect(boardResponse.body[0].jobs[0].orderId).toBe("order_1");
    expect(boardResponse.body[0].jobs[0].order.client.name).toBe("Ana");
    expect(boardResponse.body[0].jobs[0].orderItem.description).toBe("Vestido");
    expect(jobResponse.status).toBe(200);
    expect(jobResponse.body.id).toBe("job_1");
    expect(jobResponse.body.stage.name).toBe("Preparacion");
    expect(jobResponse.body.order.client.name).toBe("Ana");
    expect(jobResponse.body.orderItem.description).toBe("Vestido");
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body[0]).toMatchObject({
      id: "event_1",
      fromStageId: null,
      toStageId: "stage_1",
    });
    expect(service.getProductionBoard).toHaveBeenCalledWith({
      orderId: "order_1",
      status: "BLOCKED",
      assignedTo: "tailor_1",
    });
    expect(service.getProductionJob).toHaveBeenCalledWith("job_1");
    expect(service.listProductionEvents).toHaveBeenCalledWith("job_1");
  });

  it("rejects invalid board filters before calling the service", async () => {
    const response = await request(testApp()).get(
      "/production/board?status=UNKNOWN",
    );

    expect(response.status).toBe(400);
    expect(service.getProductionBoard).not.toHaveBeenCalled();
  });

  it("creates and updates stages with validated input and actor", async () => {
    const createResponse = await request(testApp())
      .post("/production/stages")
      .send({ name: "Corte", position: 2 });
    const updateResponse = await request(testApp())
      .put("/production/stages/stage_2")
      .send({ name: "Confeccion", position: 3, isActive: true });

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(service.createStage).toHaveBeenCalledWith(
      { name: "Corte", position: 2 },
      "user_1",
    );
    expect(service.updateStage).toHaveBeenCalledWith(
      "stage_2",
      { name: "Confeccion", position: 3, isActive: true },
      "user_1",
    );
  });

  it("rejects malformed stage updates before calling the service", async () => {
    const response = await request(testApp())
      .put("/production/stages/stage_1")
      .send({ position: 0 });

    expect(response.status).toBe(400);
    expect(service.updateStage).not.toHaveBeenCalled();
  });

  it("moves, blocks, unblocks, and edits jobs through validated routes", async () => {
    const app = testApp();
    const moveResponse = await request(app)
      .post("/production/jobs/job_1/move")
      .send({ stageId: "stage_2", notes: "Revisar costura" });
    const blockResponse = await request(app).post(
      "/production/jobs/job_1/block",
    );
    const unblockResponse = await request(app).post(
      "/production/jobs/job_1/unblock",
    );
    const updateResponse = await request(app)
      .put("/production/jobs/job_1")
      .send({ description: "Dobladillo", assignedTo: null, dueDate: null });

    expect(moveResponse.status).toBe(200);
    expect(blockResponse.status).toBe(200);
    expect(unblockResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(service.moveJob).toHaveBeenCalledWith(
      "job_1",
      { stageId: "stage_2", notes: "Revisar costura" },
      "user_1",
    );
    expect(service.blockJob).toHaveBeenCalledWith("job_1", "user_1");
    expect(service.unblockJob).toHaveBeenCalledWith("job_1", "user_1");
    expect(service.updateJob).toHaveBeenCalledWith(
      "job_1",
      { description: "Dobladillo", assignedTo: null, dueDate: null },
      "user_1",
    );
  });

  it("rejects malformed job operations before reaching the service", async () => {
    const response = await request(testApp())
      .post("/production/jobs/job_1/move")
      .send({ stageId: "" });

    expect(response.status).toBe(400);
    expect(service.moveJob).not.toHaveBeenCalled();
  });
});
