import {
  supplierErrorResponses,
  registry,
  security,
} from "./common.js";
import { supplierIdParamSchema, supplierSchema } from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/suppliers/{id}",
  summary: "Get supplier by ID",
  tags: ["suppliers"],
  security,
  request: { params: supplierIdParamSchema },
  responses: {
    200: {
      description: "Supplier retrieved",
      content: { "application/json": { schema: supplierSchema } },
    },
    ...supplierErrorResponses,
  },
});