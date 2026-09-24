import { z } from "zod";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  updateSupplierSchema,
} from "../schema.js";

export { createSupplierSchema, listSuppliersQuerySchema, updateSupplierSchema };

export const supplierSchema = z.object({
  id: z.string().meta({ example: "clx123abc456def" }),
  name: z.string().meta({ example: "Telas del Sur" }),
  phone: z.string().nullable().meta({ example: "+56 9 1234 5678" }),
  email: z.email().nullable().meta({ example: "ventas@telasdelsur.cl" }),
  notes: z.string().nullable().meta({ example: "Fabric supplier" }),
  deletedAt: z.iso.datetime().nullable().meta({ example: null }),
  createdAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  updatedAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
});

export const supplierItemSchema = z.object({
  id: z.string().meta({ example: "clx123abc456def" }),
  name: z.string().meta({ example: "Tela de algodón" }),
  sku: z.string().nullable().meta({ example: "TEL-001" }),
  unit: z
    .enum(["METER", "UNIT", "ROLL", "KILOGRAM"])
    .meta({ example: "METER" }),
  quantity: z.string().meta({ example: "10.000" }),
  reorderPoint: z.string().meta({ example: "5.000" }),
  createdAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  updatedAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  deletedAt: z.iso.datetime().nullable().meta({ example: null }),
});

export const supplierDetailSchema = supplierSchema.extend({
  items: z.array(supplierItemSchema),
});

export const listSuppliersResponseSchema = z.object({
  data: z.array(supplierSchema),
  meta: z.object({
    page: z.number().int().meta({ example: 1 }),
    limit: z.number().int().meta({ example: 20 }),
    total: z.number().int().meta({ example: 42 }),
    totalPages: z.number().int().meta({ example: 3 }),
  }),
});

export const supplierIdParamSchema = z.object({
  id: z
    .string()
    .meta({ description: "Supplier identifier", example: "clx123abc456def" }),
});
