import { inventoryErrorResponses, registry, security } from "./common.js";
import { inventoryItemIdParamSchema, inventoryItemSchema } from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/inventory/items/{id}",
  summary: "Get inventory item by ID",
  tags: ["inventory"],
  security,
  request: { params: inventoryItemIdParamSchema },
  responses: {
    200: {
      description: "Inventory item retrieved",
      content: { "application/json": { schema: inventoryItemSchema } },
    },
    ...inventoryErrorResponses,
  },
});
