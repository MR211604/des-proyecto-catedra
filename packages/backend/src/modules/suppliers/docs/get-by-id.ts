import { supplierErrorResponses, registry, security } from "./common.js";
import {
  supplierDetailSchema,
  supplierIdParamSchema,
  supplierItemsQuerySchema,
} from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/suppliers/{id}",
  summary: "Get supplier by ID",
  tags: ["suppliers"],
  security,
  request: {
    params: supplierIdParamSchema,
    query: supplierItemsQuerySchema,
  },
  responses: {
    200: {
      description: "Supplier retrieved",
      content: { "application/json": { schema: supplierDetailSchema } },
    },
    ...supplierErrorResponses,
  },
});
