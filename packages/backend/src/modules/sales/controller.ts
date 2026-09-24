import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import type {
  CreatePaymentInput,
  CreateSaleInput,
  ListPaymentsQuery,
  ListSalesQuery,
  UpdatePaymentInput,
} from "./schema.js";
import * as service from "./service.js";

type SaleParams = { id: string };
type PaymentParams = { saleId: string; paymentId: string };

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
      await service.listSales(response.locals.validatedQuery as ListSalesQuery),
    );
  } catch (error) {
    next(error);
  }
}

export async function getById(
  request: Request<SaleParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.getSaleById(request.params.id));
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
      .json(await service.createSale(request.body as CreateSaleInput));
  } catch (error) {
    next(error);
  }
}

export async function voidSale(
  request: Request<SaleParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await service.voidSale(request.params.id));
  } catch (error) {
    next(error);
  }
}

export async function listPayments(
  request: Request<{ saleId: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.listPayments(
        request.params.saleId,
        response.locals.validatedQuery as ListPaymentsQuery,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function createPayment(
  request: Request<{ saleId: string }>,
  response: Response,
  next: NextFunction,
) {
  try {
    response
      .status(201)
      .json(
        await service.createPayment(
          request.params.saleId,
          request.body as CreatePaymentInput,
          actorId(request),
        ),
      );
  } catch (error) {
    next(error);
  }
}

export async function updatePayment(
  request: Request<PaymentParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.updatePayment(
        request.params.saleId,
        request.params.paymentId,
        request.body as UpdatePaymentInput,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function deletePayment(
  request: Request<PaymentParams>,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(
      await service.deletePayment(
        request.params.saleId,
        request.params.paymentId,
      ),
    );
  } catch (error) {
    next(error);
  }
}
