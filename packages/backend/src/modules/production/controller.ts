import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type {
  CreateStageInput,
  JobTransitionInput,
  MoveJobInput,
  ProductionBoardQuery,
  UpdateJobInput,
  UpdateStageInput,
} from "./schema.js";
import * as service from "./service.js";

type IdParams = { id: string };
const actorId = (request: Request) => getAuth(request).userId as string;

export async function list(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.listStages());
  } catch (error) {
    next(error);
  }
}

export async function board(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const query = response.locals.validatedQuery as ProductionBoardQuery;
    response.json(await service.getProductionBoard(query));
  } catch (error) {
    next(error);
  }
}

export async function getJob(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.getProductionJob(request.params.id));
  } catch (error) {
    next(error);
  }
}

export async function events(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.listProductionEvents(request.params.id));
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
        await service.createStage(
          request.body as CreateStageInput,
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
      await service.updateStage(
        request.params.id,
        request.body as UpdateStageInput,
        actorId(request),
      ),
    );
  } catch (error) {
    next(error);
  }
}

async function runJobAction(
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

export function move(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  return runJobAction(request, response, next, (id, actor) =>
    service.moveJob(id, request.body as MoveJobInput, actor),
  );
}

export function block(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  const notes = (request.body as JobTransitionInput).notes;
  return runJobAction(request, response, next, (id, actor) =>
    notes === undefined
      ? service.blockJob(id, actor)
      : service.blockJob(id, actor, notes),
  );
}

export function unblock(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  const notes = (request.body as JobTransitionInput).notes;
  return runJobAction(request, response, next, (id, actor) =>
    notes === undefined
      ? service.unblockJob(id, actor)
      : service.unblockJob(id, actor, notes),
  );
}

export async function updateJob(
  request: Request<IdParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.updateJob(
        request.params.id,
        request.body as UpdateJobInput,
        actorId(request),
      ),
    );
  } catch (error) {
    next(error);
  }
}
