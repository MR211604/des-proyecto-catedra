import { ArrowLeftRight, X } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../lib/api.ts";
import { useInventoryMovements, useInventoryMutations } from "../api.ts";
import { formatInventoryQuantity } from "../formatters.ts";
import type { InventoryItem, SortOrder, StockMovementType } from "../types.ts";
import {
  formatMovementQuantity,
  movementDefinitions,
  movementDelta,
  movementLabel,
  movementTypes,
} from "./movementPresentation.ts";

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

export function MovementDrawer({
  item,
  itemLoading,
  itemError,
  onRetryItem,
  history,
  onHistoryChange,
  onClose,
}: {
  item: InventoryItem | null;
  itemLoading?: boolean;
  itemError?: boolean;
  onRetryItem?: () => void;
  history: {
    page: number;
    type: StockMovementType | undefined;
    order: SortOrder;
  };
  onHistoryChange: (updates: {
    page?: number;
    type?: StockMovementType;
    order?: SortOrder;
  }) => void;
  onClose: () => void;
}) {
  const movementsQuery = useInventoryMovements(item?.id, {
    page: history.page,
    limit: 10,
    type: history.type,
    order: history.order,
  });
  const { movement } = useInventoryMutations();
  const [type, setType] = useState<StockMovementType>("RECEIPT");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
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
      if (!item) return;
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

  if (!item) {
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
        <aside className="flex h-full w-full max-w-140 flex-col overflow-y-auto bg-[#fffafd] shadow-[-12px_0_40px_rgba(74,46,71,0.2)]">
          <header className="flex items-start justify-between gap-4 border-b border-[#eadfe8] px-6 py-6">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[#98728f]">
                Control de inventario
              </p>
              <h2 className="mt-2 mb-0 text-2xl font-bold text-[#211b21]">
                Movimientos
              </h2>
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
          {itemLoading ? (
            <p className="p-6 text-sm text-[#806f7d]">
              Cargando el material...
            </p>
          ) : itemError ? (
            <div className="grid gap-3 p-6 text-sm text-[#a32626]">
              <p className="m-0">No se pudo cargar el material.</p>
              <button
                className="w-fit rounded-lg bg-[#8b5e83] px-3 py-2 text-xs font-bold text-white"
                onClick={onRetryItem}
                type="button"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <p className="p-6 text-sm text-[#806f7d]">
              No se encontró el material solicitado.
            </p>
          )}
        </aside>
      </div>
    );
  }

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
      <aside className="flex h-full w-full max-w-140 flex-col overflow-y-auto bg-[#fffafd] shadow-[-12px_0_40px_rgba(74,46,71,0.2)]">
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

        {!item.deletedAt ? (
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
        ) : (
          <p className="m-0 border-b border-[#eadfe8] bg-[#f8f0f7] px-6 py-4 text-sm text-[#6f616d]">
            Este material está inactivo. El historial está disponible en modo
            consulta.
          </p>
        )}

        <section className="px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="m-0 text-base font-bold text-[#302630]">
                Historial de movimientos
              </h3>
              <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                {movementsQuery.data
                  ? `${movementsQuery.data.meta.total} movimientos · Página ${movementsQuery.data.meta.page} de ${Math.max(movementsQuery.data.meta.totalPages, 1)}`
                  : "Consulta el historial operativo del material."}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <label className="sr-only" htmlFor="movement-type-filter">
                Filtrar movimientos por tipo
              </label>
              <select
                aria-label="Filtrar movimientos por tipo"
                className="h-9 max-w-35 border border-[#dfcedc] bg-white px-2 text-xs text-[#4d4350] outline-none focus:border-[#8b5e83]"
                id="movement-type-filter"
                onChange={(event) => {
                  const nextType = event.target.value;
                  onHistoryChange({
                    type:
                      nextType === "ALL"
                        ? undefined
                        : (nextType as StockMovementType),
                    page: 1,
                  });
                }}
                value={history.type ?? "ALL"}
              >
                <option value="ALL">Todos</option>
                {movementTypes.map((movementType) => (
                  <option key={movementType.value} value={movementType.value}>
                    {movementType.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="movement-order">
                Ordenar movimientos
              </label>
              <select
                aria-label="Ordenar movimientos"
                className="h-9 border border-[#dfcedc] bg-white px-2 text-xs text-[#4d4350] outline-none focus:border-[#8b5e83]"
                id="movement-order"
                onChange={(event) =>
                  onHistoryChange({
                    order: event.target.value as SortOrder,
                    page: 1,
                  })
                }
                value={history.order}
              >
                <option value="desc">Más recientes</option>
                <option value="asc">Más antiguos</option>
              </select>
            </div>
          </div>
          {movementsQuery.isPending ? (
            <p className="mt-5 text-sm text-[#806f7d]">
              Cargando movimientos...
            </p>
          ) : movementsQuery.isError ? (
            <div className="mt-5 grid gap-3 rounded-lg bg-[#fff1f1] p-3 text-sm text-[#a32626]">
              <p className="m-0">No se pudo cargar el historial.</p>
              <button
                className="w-fit rounded-lg bg-[#8b5e83] px-3 py-2 text-xs font-bold text-white"
                onClick={() => void movementsQuery.refetch()}
                type="button"
              >
                Reintentar
              </button>
            </div>
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
                      <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                        Unidad: {movementItem.unit}
                      </p>
                      {movementItem.reason ? (
                        <p className="mt-1 mb-0 text-xs text-[#5b4b58]">
                          Motivo: {movementItem.reason}
                        </p>
                      ) : null}
                      {movementItem.orderItem ? (
                        <p className="mt-1 mb-0 text-xs text-[#5b4b58]">
                          Order Item: {movementItem.orderItem.description} ·
                          Pedido {movementItem.orderItem.orderId}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {movementsQuery.data && movementsQuery.data.meta.total > 0 ? (
            <footer className="mt-5 flex items-center justify-between gap-3 border-t border-[#eadfe8] pt-4 text-xs text-[#806f7d]">
              <span>
                Mostrando{" "}
                {(movementsQuery.data.meta.page - 1) *
                  movementsQuery.data.meta.limit +
                  1}
                -
                {Math.min(
                  movementsQuery.data.meta.page *
                    movementsQuery.data.meta.limit,
                  movementsQuery.data.meta.total,
                )}{" "}
                de {movementsQuery.data.meta.total} · Página {history.page} de{" "}
                {Math.max(movementsQuery.data.meta.totalPages, 1)}
              </span>
              <div className="flex gap-1">
                <button
                  aria-label="Página anterior de movimientos"
                  className="rounded-md px-2 py-1 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={history.page <= 1}
                  onClick={() =>
                    onHistoryChange({ page: Math.max(1, history.page - 1) })
                  }
                  type="button"
                >
                  Anterior
                </button>
                <button
                  aria-label="Página siguiente de movimientos"
                  className="rounded-md px-2 py-1 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={history.page >= movementsQuery.data.meta.totalPages}
                  onClick={() => onHistoryChange({ page: history.page + 1 })}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </footer>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
