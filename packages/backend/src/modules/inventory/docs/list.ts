import {
  inventoryResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  listInventoryItemsQuerySchema,
  listInventoryItemsResponseSchema,
} from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/inventory/items",
  summary: "List inventory items",
  tags: ["inventory"],
  security,
  request: { query: listInventoryItemsQuerySchema },
  responses: {
    200: {
      description: "Inventory items retrieved",
      content: {
        "application/json": { schema: listInventoryItemsResponseSchema },
      },
    },
    ...validationResponse,
    ...inventoryResponses,
  },
});
