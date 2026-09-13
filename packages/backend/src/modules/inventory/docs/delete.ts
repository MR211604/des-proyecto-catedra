import {
  errorResponseSchema,
  inventoryErrorResponses,
  registry,
  security,
} from "./common.js";
import { inventoryItemIdParamSchema, inventoryItemSchema } from "./schemas.js";

registry.registerPath({
  method: "delete",
  path: "/api/v1/inventory/items/{id}",
  summary: "Soft-delete inventory item",
  tags: ["inventory"],
  security,
  request: { params: inventoryItemIdParamSchema },
  responses: {
    200: {
      description: "Inventory item deleted",
      content: { "application/json": { schema: inventoryItemSchema } },
    },
    ...inventoryErrorResponses,
    409: {
      description: "Item already deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
