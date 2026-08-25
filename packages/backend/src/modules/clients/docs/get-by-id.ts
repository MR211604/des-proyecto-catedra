import { clientErrorResponses, registry, security } from "./common.js";
import { clientIdParamSchema, clientSchema } from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/clients/{id}",
  summary: "Get client by ID",
  tags: ["clients"],
  security,
  request: { params: clientIdParamSchema },
  responses: {
    200: {
      description: "Client retrieved",
      content: { "application/json": { schema: clientSchema } },
    },
    ...clientErrorResponses,
  },
});
