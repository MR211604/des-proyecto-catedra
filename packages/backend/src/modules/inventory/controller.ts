import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type {
  ListInventoryItemsQuery,
  ListStockMovementsQuery,
} from "./schema.js";
import * as service from "./service.js";

type ParamWithId = { id: string };
type ParamWithItemId = { itemId: string };

export async function list(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const query = response.locals.validatedQuery as ListInventoryItemsQuery;
    const result = await service.listInventoryItems(query);
    response.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(
  request: Request<ParamWithId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const item = await service.getInventoryItemById(request.params.id);
    response.json(item);
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
    const item = await service.createInventoryItem(request.body);
    response.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function update(
  request: Request<ParamWithId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const item = await service.updateInventoryItem(
      request.params.id,
      request.body,
    );
    response.json(item);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  request: Request<ParamWithId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const item = await service.deleteInventoryItem(request.params.id);
    response.json(item);
  } catch (error) {
    next(error);
  }
}

export async function restore(
  request: Request<ParamWithId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const item = await service.restoreInventoryItem(request.params.id);
    response.json(item);
  } catch (error) {
    next(error);
  }
}

export async function createMovement(
  request: Request<ParamWithItemId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const { userId } = getAuth(request);
    const movement = await service.createStockMovement(
      request.params.itemId,
      request.body,
      userId as string,
    );
    response.status(201).json(movement);
  } catch (error) {
    next(error);
  }
}

export async function listMovements(
  request: Request<ParamWithItemId>,
  response: Response,
  next: NextFunction,
) {
  try {
    const query = response.locals.validatedQuery as ListStockMovementsQuery;
    const result = await service.listStockMovements(
      request.params.itemId,
      query,
    );
    response.json(result);
  } catch (error) {
    next(error);
  }
}
