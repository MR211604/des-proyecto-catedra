import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type { CreateStageInput, UpdateStageInput } from "./schema.js";
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
