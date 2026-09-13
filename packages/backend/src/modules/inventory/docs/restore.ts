import {
  errorResponseSchema,
  inventoryErrorResponses,
  registry,
  security,
} from "./common.js";
import { inventoryItemIdParamSchema, inventoryItemSchema } from "./schemas.js";

registry.registerPath({
  method: "patch",
  path: "/api/v1/inventory/items/{id}/restore",
  summary: "Restore inventory item",
  tags: ["inventory"],
  security,
  request: { params: inventoryItemIdParamSchema },
  responses: {
    200: {
      description: "Inventory item restored",
      content: { "application/json": { schema: inventoryItemSchema } },
    },
    ...inventoryErrorResponses,
    409: {
      description: "Item is not deleted",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
