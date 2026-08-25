import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<T extends z.ZodType>(schema: T) {
  return (request: Request, _response: Response, next: NextFunction) => {
    request.body = schema.parse(request.body);
    next();
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return (request: Request, response: Response, next: NextFunction) => {
    response.locals.validatedQuery = schema.parse(request.query);
    next();
  };
}
