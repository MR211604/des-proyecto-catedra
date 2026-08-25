import {
  clientResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import { clientSchema, createClientSchema } from "./schemas.js";

registry.registerPath({
  method: "post",
  path: "/api/v1/clients",
  summary: "Create client",
  tags: ["clients"],
  security,
  request: {
    body: {
      content: { "application/json": { schema: createClientSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Client created",
      content: { "application/json": { schema: clientSchema } },
    },
    ...validationResponse,
    ...clientResponses,
  },
});
