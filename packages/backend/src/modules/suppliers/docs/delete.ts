import {
  supplierErrorResponses,
  errorResponseSchema,
  registry,
  security,
} from "./common.js";
import { supplierIdParamSchema, supplierSchema } from "./schemas.js";

registry.registerPath({
  method: "delete",
  path: "/api/v1/suppliers/{id}",
  summary: "Soft-delete supplier",
  tags: ["suppliers"],
  security,
  request: { params: supplierIdParamSchema },
  responses: {
    200: {
      description: "Supplier deleted",
      content: { "application/json": { schema: supplierSchema } },
    },
    ...supplierErrorResponses,
    409: {
      description: "Supplier already deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});