import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, errorHandler } from "../../middleware/errors.js";

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
  listSuppliers: vi.fn(async () => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })),
  getSupplierById: vi.fn(async () => ({ id: "supplier_1", items: [] })),
  createSupplier: vi.fn(async (input) => ({ id: "supplier_1", ...input })),
  updateSupplier: vi.fn(async () => ({ id: "supplier_1" })),
  deleteSupplier: vi.fn(async () => ({ id: "supplier_1", deletedAt: null })),
  restoreSupplier: vi.fn(async () => ({ id: "supplier_1", deletedAt: null })),
}));

const { supplierRouter } = await import("./router.js");
const {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
} = await import("./service.js");

function testApp() {
  const app = express();
  app.use(express.json());
  app.use("/suppliers", supplierRouter);
  app.use(errorHandler);
  return app;
}

describe("Suppliers HTTP contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.isAuthenticated = true;
    auth.orgRole = "org:member";
  });

  it("requires an authenticated workshop user", async () => {
    auth.isAuthenticated = false;

    const response = await request(testApp()).get("/suppliers");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
    expect(listSuppliers).not.toHaveBeenCalled();
  });

  it("allows the privileged role and rejects users without the workshop role", async () => {
    auth.orgRole = "org:admin";
    await expect(request(testApp()).get("/suppliers")).resolves.toHaveProperty(
      "status",
      200,
    );

    auth.orgRole = "org:guest";
    const response = await request(testApp()).get("/suppliers");

    expect(response.status).toBe(403);
    expect(listSuppliers).toHaveBeenCalledOnce();
  });

  it("creates a supplier", async () => {
    const response = await request(testApp()).post("/suppliers").send({
      name: "Telas del Sur",
      phone: "+56 9 1234 5678",
      email: "ventas@telasdelsur.cl",
      notes: "Fabric supplier",
    });

    expect(response.status).toBe(201);
    expect(vi.mocked(createSupplier)).toHaveBeenCalledWith({
      name: "Telas del Sur",
      phone: "+56 9 1234 5678",
      email: "ventas@telasdelsur.cl",
      notes: "Fabric supplier",
    });
    expect(response.body.id).toBe("supplier_1");
  });

  it("rejects a supplier without a name or with invalid fields", async () => {
    const response = await request(testApp()).post("/suppliers").send({
      phone: "+56 9 1234 5678",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(createSupplier).not.toHaveBeenCalled();
  });

  it("lists suppliers with validated pagination parameters", async () => {
    const response = await request(testApp()).get(
      "/suppliers?page=2&limit=5&search=telas&status=inactive&sortBy=name&order=desc&includeDeleted=true",
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(listSuppliers)).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: "telas",
      status: "inactive",
      sortBy: "name",
      order: "desc",
      includeDeleted: true,
    });
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it("rejects invalid list filters before calling the service", async () => {
    const response = await request(testApp()).get(
      "/suppliers?page=0&limit=101&sortBy=phone&order=sideways",
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(listSuppliers).not.toHaveBeenCalled();
  });

  it.each([
    [
      "get",
      "getSupplierById",
      () => request(testApp()).get("/suppliers/supplier_1"),
    ],
    [
      "update",
      "updateSupplier",
      () =>
        request(testApp())
          .put("/suppliers/supplier_1")
          .send({ name: "Telas del Sur Ltda.", notes: "Preferred supplier" }),
    ],
    [
      "delete",
      "deleteSupplier",
      () => request(testApp()).delete("/suppliers/supplier_1"),
    ],
    [
      "restore",
      "restoreSupplier",
      () => request(testApp()).patch("/suppliers/supplier_1/restore"),
    ],
  ] as const)(
    "supports the %s CRUD operation",
    async (_operation, serviceName, makeRequest) => {
      const response = await makeRequest();

      expect(response.status).toBe(200);
      expect(
        vi.mocked(
          { getSupplierById, updateSupplier, deleteSupplier, restoreSupplier }[
            serviceName
          ],
        ),
      ).toHaveBeenCalledWith(
        ...(serviceName === "updateSupplier"
          ? [
              "supplier_1",
              { name: "Telas del Sur Ltda.", notes: "Preferred supplier" },
            ]
          : ["supplier_1"]),
      );
    },
  );

  it("rejects an update without any valid field", async () => {
    const response = await request(testApp())
      .put("/suppliers/supplier_1")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(updateSupplier).not.toHaveBeenCalled();
  });

  it("passes not-found and conflict service errors through the HTTP error contract", async () => {
    vi.mocked(getSupplierById).mockRejectedValueOnce(
      new AppError(404, "Supplier not found"),
    );

    const notFound = await request(testApp()).get("/suppliers/supplier_1");

    expect(notFound.status).toBe(404);
    expect(notFound.body.error).toBe("Supplier not found");

    vi.mocked(deleteSupplier).mockRejectedValueOnce(
      new AppError(409, "Supplier is already deleted"),
    );

    const conflict = await request(testApp()).delete("/suppliers/supplier_1");

    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toBe("Supplier is already deleted");
  });

  it.each([
    [
      "update",
      updateSupplier,
      () => request(testApp()).put("/suppliers/supplier_1").send({ name: "X" }),
    ],
    [
      "delete",
      deleteSupplier,
      () => request(testApp()).delete("/suppliers/supplier_1"),
    ],
    [
      "restore",
      restoreSupplier,
      () => request(testApp()).patch("/suppliers/supplier_1/restore"),
    ],
  ] as const)(
    "returns 404 when the %s target does not exist",
    async (_operation, operation, makeRequest) => {
      vi.mocked(operation).mockRejectedValueOnce(
        new AppError(404, "Supplier not found"),
      );

      const response = await makeRequest();

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Supplier not found");
    },
  );

  it("returns 409 when restoring a supplier that is not deactivated", async () => {
    vi.mocked(restoreSupplier).mockRejectedValueOnce(
      new AppError(409, "Supplier is not deleted"),
    );

    const response = await request(testApp()).patch(
      "/suppliers/supplier_1/restore",
    );

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Supplier is not deleted");
  });

  it("passes service errors through the HTTP error contract", async () => {
    vi.mocked(getSupplierById).mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const response = await request(testApp()).get("/suppliers/supplier_1");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");
  });
});
