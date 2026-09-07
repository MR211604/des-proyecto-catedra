import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import { verifyToken } from "@clerk/backend";
import { WebSocketServer, type WebSocket } from "ws";
import { env } from "../../config/env.js";

export const PRODUCTION_PROTOCOL = "clerk.";

export type ProductionChangedEvent = {
  type: "production.changed";
  operation: string;
  actorId: string;
  occurredAt: string;
  context: {
    job?: { id: string };
    order?: { id: string };
    stage?: { id: string };
  };
};

class ProductionEventHub {
  private readonly clients = new Set<WebSocket>();

  add(client: WebSocket) {
    this.clients.add(client);
    client.once("close", () => this.clients.delete(client));
    client.once("error", () => this.clients.delete(client));
  }

  publish(event: ProductionChangedEvent) {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState !== client.OPEN) {
        this.clients.delete(client);
        continue;
      }
      try {
        client.send(payload, (error) => {
          if (error) this.clients.delete(client);
        });
      } catch {
        this.clients.delete(client);
      }
    }
  }

  get size() {
    return this.clients.size;
  }
}

export const productionEvents = new ProductionEventHub();

function rejectUpgrade(socket: Duplex, status: number) {
  socket.write(`HTTP/1.1 ${status} Unauthorized\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function tokenFromProtocols(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const protocol = value
    ?.split(",")
    .map((item) => item.trim())
    .find((item) => item.startsWith(PRODUCTION_PROTOCOL));
  return protocol?.slice(PRODUCTION_PROTOCOL.length);
}

export function attachProductionWebSocket(server: Server) {
  const webSocketServer = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) =>
      [...protocols].find((protocol) =>
        protocol.startsWith(PRODUCTION_PROTOCOL),
      ) ?? false,
  });

  server.on("upgrade", (request, socket, head) => {
    const token = tokenFromProtocols(request.headers["sec-websocket-protocol"]);
    if (!token) {
      rejectUpgrade(socket, 401);
      return;
    }

    void verifyToken(token, { secretKey: env.CLERK_SECRET_KEY })
      .then((claims) => {
        if (!claims.sub) {
          rejectUpgrade(socket, 401);
          return;
        }
        webSocketServer.handleUpgrade(request, socket, head, (client) => {
          productionEvents.add(client);
        });
      })
      .catch(() => rejectUpgrade(socket, 401));
  });

  return webSocketServer;
}
