import {
  clientErrorResponses,
  errorResponseSchema,
  registry,
  security,
} from "./common.js";
import { clientIdParamSchema, clientSchema } from "./schemas.js";

registry.registerPath({
  method: "delete",
  path: "/api/v1/clients/{id}",
  summary: "Soft-delete client",
  tags: ["clients"],
  security,
  request: { params: clientIdParamSchema },
  responses: {
    200: {
      description: "Client deleted",
      content: { "application/json": { schema: clientSchema } },
    },
    ...clientErrorResponses,
    409: {
      description: "Client already deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
