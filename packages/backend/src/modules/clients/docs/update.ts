import {
  clientErrorResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  clientIdParamSchema,
  clientSchema,
  updateClientSchema,
} from "./schemas.js";

registry.registerPath({
  method: "put",
  path: "/api/v1/clients/{id}",
  summary: "Update client",
  tags: ["clients"],
  security,
  request: {
    params: clientIdParamSchema,
    body: {
      content: { "application/json": { schema: updateClientSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Client updated",
      content: { "application/json": { schema: clientSchema } },
    },
    ...validationResponse,
    ...clientErrorResponses,
  },
});
