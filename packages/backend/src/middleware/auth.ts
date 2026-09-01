import { clerkMiddleware, getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/env.js";

export const clerk: RequestHandler = clerkMiddleware({
  secretKey: env.CLERK_SECRET_KEY,
});

export const requireUser: RequestHandler = (request, response, next) => {
  if (!getAuth(request).isAuthenticated) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  next();
};

export function requireRole(role: "org:admin" | "org:member") {
  return (request: Request, response: Response, next: NextFunction) => {
    const auth = getAuth(request);
    if (!auth.isAuthenticated) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    const assignedRole = auth.orgRole;

    if (
      assignedRole !== role &&
      !(role === "org:member" && assignedRole === "org:admin")
    ) {
      response
        .status(403)
        .json({ error: "You do not have permission to perform this action" });
      return;
    }

    next();
  };
}
