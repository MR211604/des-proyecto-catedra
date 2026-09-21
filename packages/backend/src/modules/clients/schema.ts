import { z } from "zod";

enum ClientMeasurementUnit {
  cm = "cm",
  m = "m",
}

const measurementValue = z.number().finite().nonnegative();

const measurementValuesSchema = z
  .object({
    chest: measurementValue.optional(),
    waist: measurementValue.optional(),
    hips: measurementValue.optional(),
    sleeveLength: measurementValue.optional(),
    garmentLength: measurementValue.optional(),
    shoulders: measurementValue.optional(),
  })
  .strict();

export const clientMeasurementSchema = z
  .object({
    unit: z.enum([ClientMeasurementUnit.cm, ClientMeasurementUnit.m]),
    values: measurementValuesSchema,
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (measurement) =>
      Object.values(measurement.values).some((value) => value !== undefined) ||
      Boolean(measurement.notes?.trim()),
    { message: "At least one measurement value or observation is required" },
  );

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(30),
  email: z.email().optional(),
  notes: z.string().max(1000).optional(),
  measurements: clientMeasurementSchema.optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const listClientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.enum(["name", "createdAt"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  includeDeleted: z.preprocess((v) => v === "true", z.boolean().default(false)),
});

export type ClientMeasurementInput = z.infer<typeof clientMeasurementSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
