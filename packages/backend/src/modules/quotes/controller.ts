import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { CreateQuoteInput, ListQuotesQuery } from "./schema.js";
import * as service from "./service.js";

type IdParams = { id: string };

function actorId(request: Request) {
  return getAuth(request).userId as string;
}

export async function list(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.listQuotes(
        response.locals.validatedQuery as ListQuotesQuery,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.getQuoteById(request.params.id));
  } catch (error) {
    next(error);
  }
}

export async function create(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response
      .status(201)
      .json(
        await service.createQuote(
          request.body as CreateQuoteInput,
          actorId(request),
        ),
      );
  } catch (error) {
    next(error);
  }
}

export async function update(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.updateQuote(
        request.params.id,
        request.body as CreateQuoteInput,
        actorId(request),
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function remove(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.deleteQuote(request.params.id, actorId(request)),
    );
  } catch (error) {
    next(error);
  }
}

async function runQuoteAction(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
  operation: (id: string, actorId: string) => Promise<unknown>,
) {
  try {
    response.json(await operation(request.params.id, actorId(request)));
  } catch (error) {
    next(error);
  }
}

export function send(request: Request<IdParams>, response: Response, next: NextFunction) {
  return runQuoteAction(request, response, next, service.sendQuote);
}

export function accept(request: Request<IdParams>, response: Response, next: NextFunction) {
  return runQuoteAction(request, response, next, service.acceptQuote);
}

export function reject(request: Request<IdParams>, response: Response, next: NextFunction) {
  return runQuoteAction(request, response, next, service.rejectQuote);
}

export function convert(request: Request<IdParams>, response: Response, next: NextFunction) {
  return runQuoteAction(request, response, next, service.convertQuote);
}
