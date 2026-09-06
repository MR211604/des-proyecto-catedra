import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { CreateOrderInput, ListOrdersQuery } from "./schema.js";
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
      await service.listOrders(
        response.locals.validatedQuery as ListOrdersQuery,
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
    response.json(await service.getOrderById(request.params.id));
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
        await service.createOrder(
          request.body as CreateOrderInput,
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
      await service.updateOrder(
        request.params.id,
        request.body as CreateOrderInput,
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
      await service.deleteOrder(request.params.id, actorId(request)),
    );
  } catch (error) {
    next(error);
  }
}

async function runAction(
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

export function start(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  return runAction(request, response, next, service.startOrderProduction);
}

export function ready(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  return runAction(request, response, next, service.markOrderReady);
}

export function deliver(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  return runAction(request, response, next, service.deliverOrder);
}

export function cancel(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  return runAction(request, response, next, service.cancelOrder);
}
