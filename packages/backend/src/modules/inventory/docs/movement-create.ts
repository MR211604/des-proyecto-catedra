import {
  errorResponseSchema,
  inventoryResponses,
  registry,
  security,
  validationResponse,
} from "./common.js";
import {
  createStockMovementSchema,
  inventoryItemIdMovementParamSchema,
  stockMovementSchema,
} from "./schemas.js";

registry.registerPath({
  method: "post",
  path: "/api/v1/inventory/items/{itemId}/movements",
  summary: "Create stock movement",
  tags: ["inventory"],
  security,
  request: {
    params: inventoryItemIdMovementParamSchema,
    body: {
      content: { "application/json": { schema: createStockMovementSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Stock movement created",
      content: { "application/json": { schema: stockMovementSchema } },
    },
    ...validationResponse,
    ...inventoryResponses,
    400: {
      description: "Validation failed or movement unit does not match the item",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    404: {
      description: "Item not found or deactivated",
      content: { "application/json": { schema: errorResponseSchema } },
    },
    409: {
      description: "Stock cannot go below zero",
      content: { "application/json": { schema: errorResponseSchema } },
    },
  },
});
