import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CircleDollarSign,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../lib/api.ts";
import { useInventoryMovements, useInventoryMutations } from "./api.ts";
import { formatInventoryQuantity } from "./formatters.ts";
import type { InventoryItem, StockMovementType } from "./types.ts";

const movementDefinitions: Record<
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

const movementTypes = (
  Object.keys(movementDefinitions) as StockMovementType[]
).map((value) => ({ value, label: movementDefinitions[value].label }));

function isValidQuantity(value: string, type: StockMovementType) {
  const trimmed = value.trim();
  if (movementDefinitions[type].signed) {
    return (
      /^-?\d+(?:\.\d{1,3})?$/.test(trimmed) &&
      !/^[-+]?0+(?:\.0+)?$/.test(trimmed)
    );
  }
  return /^\d+(?:\.\d{1,3})?$/.test(trimmed) && Number(trimmed) > 0;
}

function movementLabel(type: StockMovementType) {
  return movementDefinitions[type].label;
}

function movementDelta(type: StockMovementType, quantity: string) {
  return movementDefinitions[type].direction * Number(quantity);
}

function formatMovementQuantity(
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

export function MovementDrawer({
  item,
  onClose,
}: {
  item: InventoryItem;
  onClose: () => void;
}) {
  const movementsQuery = useInventoryMovements(item.id);
  const { movement } = useInventoryMutations();
  const [type, setType] = useState<StockMovementType>("RECEIPT");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidQuantity(quantity, type)) {
      setError(
        type === "ADJUSTMENT"
          ? "El ajuste debe ser distinto de cero y tener hasta 3 decimales."
          : "La cantidad debe ser positiva y tener hasta 3 decimales.",
      );
      return;
    }

    try {
      await movement.mutateAsync({
        itemId: item.id,
        input: {
          type,
          quantity: quantity.trim(),
          unit: item.unit,
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
      });
      toast.success("Movimiento registrado.");
      onClose();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "No se pudo registrar el movimiento.",
      );
    }
  };

  return (
    <div
      aria-label="Movimientos del material"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-[#211b21]/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <aside className="flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-[#fffafd] shadow-[-12px_0_40px_rgba(74,46,71,0.2)]">
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfe8] px-6 py-6">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#98728f]">
              Control de inventario
            </p>
            <h2 className="mt-2 mb-0 text-2xl font-bold text-[#211b21]">
              Movimientos
            </h2>
            <p className="mt-2 mb-0 text-sm text-[#6f616d]">
              {item.name} · {formatInventoryQuantity(item.quantity, item.unit)}
            </p>
          </div>
          <button
            aria-label="Cerrar movimientos"
            className="cursor-pointer rounded-md p-2 text-[#6f616d] hover:bg-[#f6edf5]"
            onClick={onClose}
            type="button"
          >
            <X size={21} />
          </button>
        </header>

        <section className="border-b border-[#eadfe8] px-6 py-6">
          <h3 className="m-0 text-base font-bold text-[#302630]">
            Registrar movimiento
          </h3>
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
              Tipo de movimiento
              <select
                className="h-11 border border-[#9b9aa2] bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                onChange={(event) =>
                  setType(event.target.value as StockMovementType)
                }
                value={type}
              >
                {movementTypes.map((movementType) => (
                  <option key={movementType.value} value={movementType.value}>
                    {movementType.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
                Cantidad {type === "ADJUSTMENT" ? "(puede ser negativa)" : ""}
                <input
                  className={`h-11 border bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${error ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                  min={type === "ADJUSTMENT" ? undefined : "0.001"}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder={type === "ADJUSTMENT" ? "-2.500" : "0.000"}
                  step="0.001"
                  type="number"
                  value={quantity}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
                Unidad
                <input
                  className="h-11 border border-[#d9cbd6] bg-[#f5f0f4] px-3 font-normal text-[#6f616d]"
                  disabled
                  value={item.unit}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
              Referencia{" "}
              <span className="font-normal text-[#806f7d]">(opcional)</span>
              <input
                className="h-11 border border-[#9b9aa2] bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                maxLength={200}
                onChange={(event) => setReference(event.target.value)}
                value={reference}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
              Motivo{" "}
              <span className="font-normal text-[#806f7d]">(opcional)</span>
              <textarea
                className="min-h-20 border border-[#9b9aa2] bg-white p-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                maxLength={1000}
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            </label>
            {error ? (
              <p className="m-0 text-sm text-[#a32626]">{error}</p>
            ) : null}
            <button
              className="mt-1 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-4 font-bold text-white hover:bg-[#70466a] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={movement.isPending}
              type="submit"
            >
              <ArrowLeftRight size={17} />
              {movement.isPending ? "Guardando..." : "Registrar movimiento"}
            </button>
          </form>
        </section>

        <section className="px-6 py-6">
          <h3 className="m-0 text-base font-bold text-[#302630]">
            Historial reciente
          </h3>
          {movementsQuery.isPending ? (
            <p className="mt-5 text-sm text-[#806f7d]">
              Cargando movimientos...
            </p>
          ) : movementsQuery.isError ? (
            <p className="mt-5 rounded-lg bg-[#fff1f1] p-3 text-sm text-[#a32626]">
              No se pudo cargar el historial.
            </p>
          ) : movementsQuery.data?.data.length === 0 ? (
            <p className="mt-5 text-sm text-[#806f7d]">
              Este material todavía no tiene movimientos.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {movementsQuery.data?.data.map((movementItem) => {
                const Icon = movementDefinitions[movementItem.type].icon;
                const delta = movementDelta(
                  movementItem.type,
                  movementItem.quantity,
                );
                return (
                  <article
                    className="flex items-start gap-3 rounded-lg border border-[#eadfe8] bg-white p-3"
                    key={movementItem.id}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4eaf3] text-[#8b5e83]">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm text-[#302630]">
                          {movementLabel(movementItem.type)}
                        </strong>
                        <span
                          className={`shrink-0 text-sm font-bold ${delta < 0 ? "text-[#a33b3b]" : "text-[#2f7a4a]"}`}
                        >
                          {formatMovementQuantity(
                            movementItem.type,
                            movementItem.quantity,
                            movementItem.unit,
                          )}
                        </span>
                      </div>
                      <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                        {new Intl.DateTimeFormat("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(movementItem.createdAt))}
                        {movementItem.reference
                          ? ` · ${movementItem.reference}`
                          : ""}
                      </p>
                      {movementItem.reason ? (
                        <p className="mt-1 mb-0 text-xs text-[#5b4b58]">
                          {movementItem.reason}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
