import type { InventoryUnit } from "./types.ts";

const unitLabels: Record<InventoryUnit, string> = {
  METER: "m",
  UNIT: "un",
  ROLL: "rollos",
  KILOGRAM: "kg",
};

export function formatInventoryQuantity(value: string, unit: InventoryUnit) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${value} ${unitLabels[unit]}`;

  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 3,
  }).format(number)} ${unitLabels[unit]}`;
}
