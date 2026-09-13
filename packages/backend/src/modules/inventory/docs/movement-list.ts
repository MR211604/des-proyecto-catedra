import {
  inventoryResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  inventoryItemIdMovementParamSchema,
  listStockMovementsQuerySchema,
  listStockMovementsResponseSchema,
} from "./schemas.js";

registry.registerPath({
  method: "get",
  path: "/api/v1/inventory/items/{itemId}/movements",
  summary: "List stock movements",
  tags: ["inventory"],
  security,
  request: {
    params: inventoryItemIdMovementParamSchema,
    query: listStockMovementsQuerySchema,
  },
  responses: {
    200: {
      description: "Stock movements retrieved",
      content: {
        "application/json": { schema: listStockMovementsResponseSchema },
      },
    },
    ...validationResponse,
    ...inventoryResponses,
  },
});
