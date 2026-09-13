import {
  supplierResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import { createSupplierSchema, supplierSchema } from "./schemas.js";

registry.registerPath({
  method: "post",
  path: "/api/v1/suppliers",
  summary: "Create supplier",
  tags: ["suppliers"],
  security,
  request: {
    body: {
      content: { "application/json": { schema: createSupplierSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Supplier created",
      content: { "application/json": { schema: supplierSchema } },
    },
    ...validationResponse,
    ...supplierResponses,
  },
});