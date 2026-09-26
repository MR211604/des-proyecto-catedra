import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useInventoryItem, useInventoryMovements } from "./api.ts";
import { MovementDrawer } from "./components/MovementDrawer.tsx";
import {
  formatMovementQuantity,
  movementDefinitions,
  movementLabel,
  movementTypes,
} from "./components/movementPresentation.ts";
import { formatInventoryQuantity } from "./formatters.ts";
import type { SortOrder, StockMovementType } from "./types.ts";

const validMovementTypes: StockMovementType[] = [
  "RECEIPT",
  "ISSUE",
  "SALE",
  "ADJUSTMENT",
  "RETURN",
];

export function InventoryHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHistory, setDrawerHistory] = useState<{
    page: number;
    type: StockMovementType | undefined;
    order: SortOrder;
  }>({ page: 1, type: undefined, order: "desc" });

  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawType = searchParams.get("type");
  const type = validMovementTypes.includes(rawType as StockMovementType)
    ? (rawType as StockMovementType)
    : undefined;
  const order: SortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";
  const itemQuery = useInventoryItem(id);
  const historyQuery = useInventoryMovements(id, {
    page,
    limit: 20,
    type,
    order,
  });
  const item = itemQuery.data;
  const history = historyQuery.data;

  useEffect(() => {
    if (itemQuery.error) toast.error("No se pudo cargar el material.");
  }, [itemQuery.error]);

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  if (itemQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando material...
      </div>
    );
  }

  if (itemQuery.isError || !item) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="m-0 text-base font-bold text-[#302630]">
            No se pudo cargar el material.
          </p>
          <button
            className="mt-4 rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
            onClick={() => navigate("/inventario")}
            type="button"
          >
            Volver al inventario
          </button>
        </div>
      </div>
    );
  }

  const meta = history?.meta;
  const showFrom =
    meta && meta.total > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const showTo = meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
      <button
        className="mb-7 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-bold text-[#5f525d] hover:text-[#70466a]"
        onClick={() => navigate("/inventario")}
        type="button"
      >
        <ArrowLeft size={18} /> Volver al inventario
      </button>
      <header className="mb-7 flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            Historial de movimientos
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            {item.name}
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            {item.sku ? `SKU ${item.sku} · ` : ""}
            {formatInventoryQuantity(item.quantity, item.unit)} disponibles
          </p>
        </div>
        <button
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a]"
          onClick={() => {
            setDrawerHistory({ page: 1, type: undefined, order: "desc" });
            setDrawerOpen(true);
          }}
          type="button"
        >
          <ArrowLeftRight size={18} />
          <span>Registrar movimiento</span>
        </button>
      </header>

      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div>
            <h2 className="m-0 text-lg font-bold text-[#302630]">
              Historial completo
            </h2>
            <p className="mt-1 mb-0 text-xs text-[#806f7d]">
              {history
                ? `${history.meta.total} movimientos registrados`
                : "Consultando movimientos..."}
            </p>
          </div>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="history-type-filter">
              Filtrar movimientos por tipo
            </label>
            <select
              aria-label="Filtrar movimientos por tipo"
              className="h-10 border border-[#dfcedc] bg-white px-3 text-sm text-[#4d4350] outline-none focus:border-[#8b5e83]"
              id="history-type-filter"
              onChange={(event) =>
                updateParams({
                  type:
                    event.target.value === "ALL"
                      ? undefined
                      : event.target.value,
                  page: "1",
                })
              }
              value={type ?? "ALL"}
            >
              <option value="ALL">Todos los tipos</option>
              {movementTypes.map((movementType) => (
                <option key={movementType.value} value={movementType.value}>
                  {movementType.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="history-order">
              Ordenar movimientos
            </label>
            <select
              aria-label="Ordenar movimientos"
              className="h-10 border border-[#dfcedc] bg-white px-3 text-sm text-[#4d4350] outline-none focus:border-[#8b5e83]"
              id="history-order"
              onChange={(event) =>
                updateParams({ order: event.target.value, page: "1" })
              }
              value={order}
            >
              <option value="desc">Más recientes</option>
              <option value="asc">Más antiguos</option>
            </select>
          </div>
        </div>

        {historyQuery.isPending ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando movimientos...
          </div>
        ) : historyQuery.isError ? (
          <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
            <p className="m-0 text-sm font-semibold text-[#5d4c59]">
              No pudimos cargar el historial.
            </p>
            <button
              className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void historyQuery.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : history?.data.length === 0 ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <p className="m-0 text-sm text-[#806f7d]">
              Este material todavía no tiene movimientos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5 border-collapse text-left">
              <thead className="bg-[#fcf9fb]">
                <tr>
                  {[
                    "Tipo",
                    "Cantidad",
                    "Fecha",
                    "Trabajo realizado",
                    "Motivo",
                    "Pedido",
                  ].map((heading) => (
                    <th
                      className="border-b border-[#eee2eb] px-5 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#766774]"
                      key={heading}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history?.data.map((movement) => {
                  const Icon = movementDefinitions[movement.type].icon;
                  return (
                    <tr
                      className="border-b border-[#f1e7ef] last:border-b-0"
                      key={movement.id}
                    >
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 font-semibold text-[#302630]">
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f4eaf3] text-[#8b5e83]">
                            <Icon size={16} />
                          </span>
                          {movementLabel(movement.type)}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-4 font-bold ${movement.type === "ISSUE" || movement.type === "SALE" || (movement.type === "ADJUSTMENT" && Number(movement.quantity) < 0) ? "text-[#a33b3b]" : "text-[#2f7a4a]"}`}
                      >
                        {formatMovementQuantity(
                          movement.type,
                          movement.quantity,
                          movement.unit,
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#5f525d]">
                        {new Intl.DateTimeFormat("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(movement.createdAt))}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#5f525d]">
                        {movement.orderItem?.description ?? "—"}
                      </td>
                      <td className="max-w-60 px-5 py-4 text-sm text-[#5f525d]">
                        {movement.reason ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#5f525d]">
                        {movement.orderItem?.orderId ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex items-center justify-between border-t border-[#eee2eb] px-5 py-4 text-sm text-[#5f525d]">
          <span>
            {meta ? `Mostrando ${showFrom}-${showTo} de ${meta.total}` : ""}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Página anterior de movimientos"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Página siguiente de movimientos"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!meta || page >= meta.totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </section>

      {drawerOpen ? (
        <MovementDrawer
          item={item}
          history={drawerHistory}
          onHistoryChange={(updates) =>
            setDrawerHistory((current) => ({ ...current, ...updates }))
          }
          onClose={() => setDrawerOpen(false)}
        />
      ) : null}
    </main>
  );
}
