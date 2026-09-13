import {
  errorResponseSchema,
  inventoryResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import { createInventoryItemSchema, inventoryItemSchema } from "./schemas.js";

registry.registerPath({
  method: "post",
  path: "/api/v1/inventory/items",
  summary: "Create inventory item",
  tags: ["inventory"],
  security,
  request: {
    body: {
      content: { "application/json": { schema: createInventoryItemSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Inventory item created",
      content: { "application/json": { schema: inventoryItemSchema } },
    },
    ...validationResponse,
    ...inventoryResponses,
    409: {
      description: "Item with this SKU already exists",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
