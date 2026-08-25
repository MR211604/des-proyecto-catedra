import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { ListClientsQuery } from "./schema.js";
import * as service from "./service.js";

type ParamWithId = { id: string };

export async function list(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const query = response.locals.validatedQuery as ListClientsQuery;
    const result = await service.listClients(query);
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
    const client = await service.getClientById(request.params.id);
    response.json(client);
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
    const client = await service.createClient(request.body, userId as string);
    response.status(201).json(client);
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
    const client = await service.updateClient(
      request.params.id,
      request.body,
      userId as string,
    );
    response.json(client);
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
    const client = await service.deleteClient(
      request.params.id,
      userId as string,
    );
    response.json(client);
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
    const client = await service.restoreClient(
      request.params.id,
      userId as string,
    );
    response.json(client);
  } catch (error) {
    next(error);
  }
}
