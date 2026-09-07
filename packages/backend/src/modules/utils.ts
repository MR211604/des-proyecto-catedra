import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../middleware/errors.js";

export function toPrismaDecimal(value: string) {
  return new Prisma.Decimal(value);
}

export function serialize(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
    );
  }
  return value;
}

export function stateConflict(
  error: unknown,
  message = "Order state changed; retry the operation",
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2034")
  ) {
    throw new AppError(409, message);
  }
  throw error;
}
