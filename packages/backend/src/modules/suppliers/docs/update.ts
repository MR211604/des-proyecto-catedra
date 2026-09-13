import {
  supplierErrorResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  supplierIdParamSchema,
  supplierSchema,
  updateSupplierSchema,
} from "./schemas.js";

registry.registerPath({
  method: "put",
  path: "/api/v1/suppliers/{id}",
  summary: "Update supplier",
  tags: ["suppliers"],
  security,
  request: {
    params: supplierIdParamSchema,
    body: {
      content: { "application/json": { schema: updateSupplierSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Supplier updated",
      content: { "application/json": { schema: supplierSchema } },
    },
    ...validationResponse,
    ...supplierErrorResponses,
  },
});