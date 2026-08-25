import { clientResponses, registry, security } from "./common.js";
import {
  listClientsQuerySchema,
  listClientsResponseSchema,
} from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/clients",
  summary: "List clients",
  tags: ["clients"],
  security,
  request: { query: listClientsQuerySchema },
  responses: {
    200: {
      description: "Clients retrieved",
      content: { "application/json": { schema: listClientsResponseSchema } },
    },
    ...clientResponses,
  },
});
