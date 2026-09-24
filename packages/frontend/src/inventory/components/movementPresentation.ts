import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { formatInventoryQuantity } from "../formatters.ts";
import type { InventoryItem, StockMovementType } from "../types.ts";

export const movementDefinitions: Record<
  StockMovementType,
  {
    label: string;
    icon: typeof ArrowDownToLine;
    direction: 1 | -1;
    signed: boolean;
  }
> = {
  RECEIPT: {
    label: "Recepción",
    icon: ArrowDownToLine,
    direction: 1,
    signed: false,
  },
  ISSUE: {
    label: "Salida",
    icon: ArrowUpFromLine,
    direction: -1,
    signed: false,
  },
  SALE: {
    label: "Venta",
    icon: CircleDollarSign,
    direction: -1,
    signed: false,
  },
  ADJUSTMENT: {
    label: "Ajuste",
    icon: SlidersHorizontal,
    direction: 1,
    signed: true,
  },
  RETURN: {
    label: "Devolución",
    icon: RotateCcw,
    direction: 1,
    signed: false,
  },
};

export const movementTypes = (
  Object.keys(movementDefinitions) as StockMovementType[]
).map((value) => ({ value, label: movementDefinitions[value].label }));

export function movementLabel(type: StockMovementType) {
  return movementDefinitions[type].label;
}

export function movementDelta(type: StockMovementType, quantity: string) {
  return movementDefinitions[type].direction * Number(quantity);
}

export function formatMovementQuantity(
  type: StockMovementType,
  quantity: string,
  unit: InventoryItem["unit"],
) {
  const delta = movementDelta(type, quantity);
  const formatted = formatInventoryQuantity(
    String(Math.abs(Number(quantity))),
    unit,
  );
  return `${delta > 0 ? "+" : delta < 0 ? "-" : ""}${formatted}`;
}
