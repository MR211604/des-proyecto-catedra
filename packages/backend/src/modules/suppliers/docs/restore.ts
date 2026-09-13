import {
  supplierErrorResponses,
  errorResponseSchema,
  registry,
  security,
} from "./common.js";
import { supplierIdParamSchema, supplierSchema } from "./schemas.js";

registry.registerPath({
  method: "patch",
  path: "/api/v1/suppliers/{id}/restore",
  summary: "Restore supplier",
  tags: ["suppliers"],
  security,
  request: { params: supplierIdParamSchema },
  responses: {
    200: {
      description: "Supplier restored",
      content: { "application/json": { schema: supplierSchema } },
    },
    ...supplierErrorResponses,
    409: {
      description: "Supplier is not deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});