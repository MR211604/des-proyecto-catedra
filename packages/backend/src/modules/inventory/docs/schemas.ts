import { z } from "zod";
import {
  createInventoryItemSchema,
  createStockMovementSchema,
  listInventoryItemsQuerySchema,
  listStockMovementsQuerySchema,
  updateInventoryItemSchema,
} from "../schema.js";

export {
  createInventoryItemSchema,
  createStockMovementSchema,
  listInventoryItemsQuerySchema,
  listStockMovementsQuerySchema,
  updateInventoryItemSchema,
};

export const inventoryItemSchema = z.object({
  id: z.string().meta({ example: "clx123abc456def" }),
  name: z.string().meta({ example: "Tela de algodón" }),
  sku: z.string().nullable().meta({ example: "TEL-001" }),
  unit: z
    .enum(["METER", "UNIT", "ROLL", "KILOGRAM"])
    .meta({ example: "METER" }),
  quantity: z.string().meta({ example: "10.000" }),
  reorderPoint: z.string().meta({ example: "5.000" }),
  supplierId: z.string().nullable().meta({ example: "clx123abc456def" }),
  createdAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  updatedAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  deletedAt: z.iso.datetime().nullable().meta({ example: null }),
});

export const stockMovementSchema = z.object({
  id: z.string().meta({ example: "clx123abc456def" }),
  itemId: z.string().meta({ example: "clx123abc456def" }),
  type: z
    .enum(["RECEIPT", "ISSUE", "SALE", "ADJUSTMENT", "RETURN"])
    .meta({ example: "RECEIPT" }),
  quantity: z.string().meta({ example: "2.500" }),
  unit: z
    .enum(["METER", "UNIT", "ROLL", "KILOGRAM"])
    .meta({ example: "METER" }),
  reference: z.string().nullable().meta({ example: "PO-100" }),
  reason: z.string().nullable().meta({ example: "Incoming order" }),
  actorId: z.string().meta({ example: "user_2h3kD..." }),
  createdAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
});

export const listInventoryItemsResponseSchema = z.object({
  data: z.array(inventoryItemSchema),
  meta: z.object({
    page: z.number().int().meta({ example: 1 }),
    limit: z.number().int().meta({ example: 20 }),
    total: z.number().int().meta({ example: 42 }),
    totalPages: z.number().int().meta({ example: 3 }),
  }),
});

export const listStockMovementsResponseSchema = z.object({
  data: z.array(stockMovementSchema),
  meta: z.object({
    page: z.number().int().meta({ example: 1 }),
    limit: z.number().int().meta({ example: 20 }),
    total: z.number().int().meta({ example: 42 }),
    totalPages: z.number().int().meta({ example: 3 }),
  }),
});

export const inventoryItemIdParamSchema = z.object({
  id: z.string().meta({
    description: "Inventory item identifier",
    example: "clx123abc456def",
  }),
});

export const inventoryItemIdMovementParamSchema = z.object({
  itemId: z.string().meta({
    description: "Inventory item identifier",
    example: "clx123abc456def",
  }),
});
