import { createServer } from "node:http";
import { WebSocket } from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyToken = vi.hoisted(() => vi.fn());
vi.mock("@clerk/backend", () => ({ verifyToken }));

const { attachProductionWebSocket, productionEvents } = await import(
  "./events.js"
);

describe("production WebSocket", () => {
  let server: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    verifyToken.mockResolvedValue({ sub: "user_1" });
    server = createServer();
    attachProductionWebSocket(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    port = (server.address() as { port: number }).port;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("rejects missing and invalid Clerk credentials", async () => {
    const missing = new WebSocket(`ws://127.0.0.1:${port}`);
    const missingError = new Promise<number>((resolve) =>
      missing.once("unexpected-response", (_request, response) =>
        resolve(response.statusCode ?? 0),
      ),
    );
    await expect(missingError).resolves.toBe(401);

    verifyToken.mockRejectedValueOnce(new Error("invalid token"));
    const invalid = new WebSocket(`ws://127.0.0.1:${port}`, "clerk.invalid");
    const invalidError = new Promise<number>((resolve) =>
      invalid.once("unexpected-response", (_request, response) =>
        resolve(response.statusCode ?? 0),
      ),
    );
    await expect(invalidError).resolves.toBe(401);
  });

  it("delivers every production invalidation to authenticated clients", async () => {
    const first = new WebSocket(`ws://127.0.0.1:${port}`, "clerk.token-1");
    const second = new WebSocket(`ws://127.0.0.1:${port}`, "clerk.token-2");
    await Promise.all([
      new Promise<void>((resolve) => first.once("open", () => resolve())),
      new Promise<void>((resolve) => second.once("open", () => resolve())),
    ]);

    const event = {
      type: "production.changed" as const,
      operation: "production.job.moved",
      actorId: "user_1",
      occurredAt: "2026-09-06T12:00:00.000Z",
      context: {
        job: { id: "job_1" },
        order: { id: "order_1" },
        stage: { id: "stage_2" },
      },
    };
    const received = [first, second].map(
      (client) =>
        new Promise((resolve) =>
          client.once("message", (message) =>
            resolve(JSON.parse(message.toString())),
          ),
        ),
    );
    productionEvents.publish(event);

    await expect(Promise.all(received)).resolves.toEqual([event, event]);
    first.close();
    second.close();
  });
});
