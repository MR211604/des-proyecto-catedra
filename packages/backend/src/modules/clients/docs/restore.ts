import {
  clientErrorResponses,
  errorResponseSchema,
  registry,
  security,
} from "./common.js";
import { clientIdParamSchema, clientSchema } from "./schemas.js";

registry.registerPath({
  method: "patch",
  path: "/api/v1/clients/{id}/restore",
  summary: "Restore client",
  tags: ["clients"],
  security,
  request: { params: clientIdParamSchema },
  responses: {
    200: {
      description: "Client restored",
      content: { "application/json": { schema: clientSchema } },
    },
    ...clientErrorResponses,
    409: {
      description: "Client is not deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
