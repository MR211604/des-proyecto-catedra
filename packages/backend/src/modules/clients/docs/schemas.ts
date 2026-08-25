import { z } from "zod";
import {
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
} from "../schema.js";

export { createClientSchema, listClientsQuerySchema, updateClientSchema };

export const clientSchema = z.object({
  id: z.string().meta({ example: "clx123abc456def" }),
  name: z.string().meta({ example: "Ana Pérez" }),
  phone: z.string().nullable().meta({ example: "+56 9 1234 5678" }),
  email: z.email().nullable().meta({ example: "ana@example.com" }),
  notes: z.string().nullable().meta({ example: "Prefers WhatsApp" }),
  deletedAt: z.iso.datetime().nullable().meta({ example: null }),
  createdAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
  updatedAt: z.iso.datetime().meta({ example: "2026-08-24T12:00:00.000Z" }),
});

export const listClientsResponseSchema = z.object({
  data: z.array(clientSchema),
  meta: z.object({
    page: z.number().int().meta({ example: 1 }),
    limit: z.number().int().meta({ example: 20 }),
    total: z.number().int().meta({ example: 42 }),
    totalPages: z.number().int().meta({ example: 3 }),
  }),
});

export const clientIdParamSchema = z.object({
  id: z
    .string()
    .meta({ description: "Client identifier", example: "clx123abc456def" }),
});
