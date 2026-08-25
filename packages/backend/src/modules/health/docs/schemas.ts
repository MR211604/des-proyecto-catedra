import { z } from "zod";

export const userInfoSchema = z.object({
  name: z.string().meta({ example: "John Doe" }),
  version: z.string().meta({ example: "v1" }),
  user: z.string().meta({ example: "user_3IIhvRGoYUt6Cg4X9YGfa0qenBg" }),
  modules: z.array(z.string()).meta({
    example: [
      "dashboard",
      "clients",
      "production",
      "sales",
      "inventory",
      "orders",
    ],
  }),
});
