import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<T extends z.ZodType>(schema: T) {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.body = schema.parse(request.body);
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (request: Request, _response: Response, next: NextFunction) => {
    // biome-ignore lint/suspicious/noExplicitAny: Zod output is not assignable to ParsedQs; cast is safe because parse already validated the shape
    request.query = schema.parse(request.query) as any;
    next();
  };
}
