import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { ListSuppliersQuery } from "./schema.js";
import * as service from "./service.js";

type ParamWithId = { id: string };

export async function list(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const query = response.locals.validatedQuery as ListSuppliersQuery;
    const result = await service.listSuppliers(query);
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
    const supplier = await service.getSupplierById(request.params.id);
    response.json(supplier);
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
    const { userId } = getAuth(request);
    const supplier = await service.createSupplier(request.body, userId as string);
    response.status(201).json(supplier);
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
    const { userId } = getAuth(request);
    const supplier = await service.updateSupplier(
      request.params.id,
      request.body,
      userId as string,
    );
    response.json(supplier);
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
    const { userId } = getAuth(request);
    const supplier = await service.deleteSupplier(
      request.params.id,
      userId as string,
    );
    response.json(supplier);
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
    const { userId } = getAuth(request);
    const supplier = await service.restoreSupplier(
      request.params.id,
      userId as string,
    );
    response.json(supplier);
  } catch (error) {
    next(error);
  }
}