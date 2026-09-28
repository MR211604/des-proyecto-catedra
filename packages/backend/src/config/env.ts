import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    CORS_ORIGIN: z.url().default("*"),
    PUBLIC_API_URL: z.url().optional(),
  })
  .superRefine((values, context) => {
    if (
      process.env.NODE_ENV === "production" &&
      !values.CLERK_PUBLISHABLE_KEY
    ) {
      context.addIssue({
        code: "custom",
        message: "CLERK_PUBLISHABLE_KEY is required in production",
        path: ["CLERK_PUBLISHABLE_KEY"],
      });
    }
  });

export const env = envSchema.parse(process.env);
