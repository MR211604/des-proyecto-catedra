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
  listStages: vi.fn(async () => [
    { id: "stage_1", name: "Preparacion", position: 1, isActive: true },
  ]),
  createStage: vi.fn(async (input) => ({ id: "stage_2", ...input })),
  updateStage: vi.fn(async (id, input) => ({ id, ...input })),
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
});
