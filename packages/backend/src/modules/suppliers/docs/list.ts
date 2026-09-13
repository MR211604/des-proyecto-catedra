import {
  supplierResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  listSuppliersQuerySchema,
  listSuppliersResponseSchema,
} from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/suppliers",
  summary: "List suppliers",
  tags: ["suppliers"],
  security,
  request: { query: listSuppliersQuerySchema },
  responses: {
    200: {
      description: "Suppliers retrieved",
      content: { "application/json": { schema: listSuppliersResponseSchema } },
    },
    ...validationResponse,
    ...supplierResponses,
  },
});