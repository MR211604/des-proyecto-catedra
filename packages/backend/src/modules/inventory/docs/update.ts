import {
  errorResponseSchema,
  inventoryErrorResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  inventoryItemIdParamSchema,
  inventoryItemSchema,
  updateInventoryItemSchema,
} from "./schemas.js";

registry.registerPath({
  method: "put",
  path: "/api/v1/inventory/items/{id}",
  summary: "Update inventory item",
  tags: ["inventory"],
  security,
  request: {
    params: inventoryItemIdParamSchema,
    body: {
      content: { "application/json": { schema: updateInventoryItemSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Inventory item updated",
      content: { "application/json": { schema: inventoryItemSchema } },
    },
    ...validationResponse,
    ...inventoryErrorResponses,
    409: {
      description: "Item with this SKU already exists or is deactivated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
