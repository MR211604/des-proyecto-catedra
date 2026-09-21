import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../middleware/errors.js";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  orgRole: "org:member",
  userId: "user_1",
}));

const services = vi.hoisted(() => ({
  listClients: vi.fn(),
  getClientById: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  restoreClient: vi.fn(),
}));

vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () => (_request: unknown, _response: unknown, next: () => void) =>
      next(),
  getAuth: () => auth,
}));

vi.mock("./service.js", () => services);

const { clientRouter } = await import("./router.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/clients", clientRouter);
  app.use(errorHandler);
  return app;
}

describe("Clients HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
    services.listClients.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    services.getClientById.mockResolvedValue({
      id: "client_1",
      name: "Elena Rodriguez",
      measurements: {
        unit: "cm",
        values: { chest: 92 },
        notes: "Ajustar hombros",
      },
    });
    services.createClient.mockImplementation(async (input) => ({
      id: "client_1",
      ...input,
    }));
    services.updateClient.mockImplementation(async (_id, input) => ({
      id: "client_1",
      ...input,
    }));
    services.restoreClient.mockResolvedValue({
      id: "client_1",
      deletedAt: null,
    });
  });

  it("requires an authenticated workshop user", async () => {
    auth.isAuthenticated = false;

    const response = await request(testApp()).get("/clients/client_1");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
    expect(services.getClientById).not.toHaveBeenCalled();
  });

  it("returns a customer detail with measurements", async () => {
    const response = await request(testApp()).get("/clients/client_1");

    expect(response.status).toBe(200);
    expect(response.body.measurements.values).toEqual({ chest: 92 });
  });

  it("accepts a customer with partial measurements", async () => {
    const response = await request(testApp())
      .post("/clients")
      .send({
        name: "Elena Rodriguez",
        phone: "+56 9 1234 5678",
        notes: "Prefiere telas suaves",
        measurements: {
          unit: "cm",
          values: { chest: 92, waist: 74 },
        },
      });

    expect(response.status).toBe(201);
    expect(services.createClient).toHaveBeenCalledWith({
      name: "Elena Rodriguez",
      phone: "+56 9 1234 5678",
      notes: "Prefiere telas suaves",
      measurements: {
        unit: "cm",
        values: { chest: 92, waist: 74 },
      },
    });
  });

  it("requires name and phone when creating a customer", async () => {
    const response = await request(testApp()).post("/clients").send({
      name: "Elena Rodriguez",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(services.createClient).not.toHaveBeenCalled();
  });

  it("rejects an empty measurement record", async () => {
    const response = await request(testApp())
      .post("/clients")
      .send({
        name: "Elena Rodriguez",
        phone: "+56 9 1234 5678",
        measurements: { unit: "cm", values: {} },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(services.createClient).not.toHaveBeenCalled();
  });

  it("updates a customer and can restore an inactive customer", async () => {
    const update = await request(testApp())
      .put("/clients/client_1")
      .send({
        phone: "+56 9 9999 9999",
        measurements: {
          unit: "cm",
          values: { shoulders: 39 },
        },
      });
    const restore = await request(testApp()).patch("/clients/client_1/restore");

    expect(update.status).toBe(200);
    expect(services.updateClient).toHaveBeenCalledWith("client_1", {
      phone: "+56 9 9999 9999",
      measurements: { unit: "cm", values: { shoulders: 39 } },
    });
    expect(restore.status).toBe(200);
    expect(services.restoreClient).toHaveBeenCalledWith("client_1");
  });
});
