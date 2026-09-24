import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { useInventoryItems } from "./api.ts";
import { formatInventoryQuantity } from "./formatters.ts";
import { MovementDrawer } from "./MovementDrawer.tsx";
import type {
  InventoryItem,
  InventorySort,
  InventoryTab,
  SortOrder,
} from "./types.ts";

const tabs: { label: string; value: InventoryTab }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

function DisabledAction({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="cursor-not-allowed rounded-md p-2 text-[#96758f] opacity-55"
      disabled
      type="button"
    >
      {children}
    </button>
  );
}

function getStockStatus(quantity: string, reorderPoint: string) {
  const amount = Number(quantity);
  const threshold = Number(reorderPoint);

  if (amount <= 0) {
    return {
      label: "Agotado",
      className: "bg-[#fbe9e9] text-[#a33b3b]",
    };
  }
  if (amount <= threshold) {
    return {
      label: "Stock bajo",
      className: "bg-[#fff3d9] text-[#966519]",
    };
  }
  return {
    label: "Stock suficiente",
    className: "bg-[#e6f4eb] text-[#2f7a4a]",
  };
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const rawTab = searchParams.get("tab");
  const tab: InventoryTab =
    rawTab === "all" || rawTab === "inactive" ? rawTab : "active";
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawSort = searchParams.get("sortBy");
  const sortBy: InventorySort =
    rawSort === "sku" || rawSort === "quantity" ? rawSort : "name";
  const order: SortOrder =
    searchParams.get("order") === "desc" ? "desc" : "asc";

  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") ?? "";
    if (debouncedSearch === currentSearch) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const query = useInventoryItems({
    page,
    limit: 20,
    search: debouncedSearch,
    status: tab,
    sortBy,
    order,
  });
  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  useEffect(() => {
    if (query.error) toast.error("No se pudieron cargar los materiales.");
  }, [query.error]);

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  }

  function changeSort(nextSort: InventorySort) {
    updateParams({
      sortBy: nextSort,
      order: sortBy === nextSort && order === "asc" ? "desc" : "asc",
      page: "1",
    });
  }

  const columns = useMemo<
    ColumnDef<typeof appTableFeatures, InventoryItem, unknown>[]
  >(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ getValue }) => getValue<string | null>() ?? "—",
      },
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="font-semibold text-[#211b21]">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Cantidad",
        cell: ({ row }) =>
          formatInventoryQuantity(row.original.quantity, row.original.unit),
      },
      {
        accessorKey: "reorderPoint",
        header: "Punto de reorden",
        cell: ({ row }) =>
          formatInventoryQuantity(row.original.reorderPoint, row.original.unit),
      },
      {
        id: "stockStatus",
        header: "Estado",
        cell: ({ row }) => {
          const status = getStockStatus(
            row.original.quantity,
            row.original.reorderPoint,
          );
          return (
            <span
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <DisabledAction label="Ver material">
              <Eye size={17} />
            </DisabledAction>
            {row.original.deletedAt ? (
              <DisabledAction label="Editar material">
                <Pencil size={17} />
              </DisabledAction>
            ) : (
              <button
                aria-label="Editar material"
                className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() =>
                  navigate(`/inventario/${row.original.id}/editar`)
                }
                type="button"
              >
                <Pencil size={17} />
              </button>
            )}
            {row.original.deletedAt ? (
              <DisabledAction label="Ver movimientos del material">
                <ArrowLeftRight size={17} />
              </DisabledAction>
            ) : (
              <button
                aria-label="Ver movimientos del material"
                className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
                onClick={() => setMovementItem(row.original)}
                type="button"
              >
                <ArrowLeftRight size={17} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [navigate],
  );

  const showFrom =
    meta && meta.total > 0 && meta.page <= meta.totalPages
      ? (meta.page - 1) * meta.limit + 1
      : 0;
  const showTo =
    showFrom && meta ? Math.min(meta.page * meta.limit, meta.total) : 0;

  return (
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
      <div className="mb-7 flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            Materiales del taller
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            Inventario
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            Consulta las existencias y los materiales que requieren reposición.
          </p>
        </div>
        <button
          className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-5 font-bold text-white shadow-[0_8px_18px_-12px_#70466a] hover:bg-[#70466a]"
          onClick={() => navigate("/inventario/nuevo")}
          type="button"
        >
          <Plus size={18} />
          <span>Nuevo material</span>
        </button>
      </div>
      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div
            className="flex gap-2 rounded-xl bg-[#f8f0f7] p-1"
            role="tablist"
            aria-label="Estado de los materiales"
          >
            {tabs.map((item) => (
              <button
                aria-selected={tab === item.value}
                className={`rounded-lg border-0 px-4 py-2 text-sm font-bold transition ${tab === item.value ? "bg-white text-[#70466a] shadow-sm" : "bg-transparent text-[#8a7886]"}`}
                key={item.value}
                onClick={() => updateParams({ tab: item.value, page: "1" })}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex h-11 min-w-65 items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 text-[#8d7888] focus-within:border-[#8b5e83] max-[620px]:w-full">
            <Search size={18} />
            <span className="sr-only">Buscar materiales</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#302630] outline-none placeholder:text-[#ab9ca8]"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por nombre o SKU..."
              value={searchInput}
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[#eee2eb] px-5 py-3 text-xs text-[#806f7d] max-[620px]:items-start max-[620px]:flex-col">
          <span>
            {meta
              ? `${meta.total} ${meta.total === 1 ? "material encontrado" : "materiales encontrados"}`
              : "Consultando materiales..."}
          </span>
          <div className="flex flex-wrap gap-2">
            {(["name", "sku", "quantity"] as InventorySort[]).map((field) => (
              <button
                className="rounded-md border border-[#dfcedc] bg-white px-3 py-1.5 font-bold hover:border-[#8b5e83]"
                key={field}
                onClick={() => changeSort(field)}
                type="button"
              >
                {field === "name"
                  ? "Nombre"
                  : field === "sku"
                    ? "SKU"
                    : "Cantidad"}{" "}
                {sortBy === field ? (order === "asc" ? "↑" : "↓") : ""}
              </button>
            ))}
          </div>
        </div>
        {query.isPending ? (
          <div className="grid min-h-80 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando materiales...
          </div>
        ) : query.isError ? (
          <div className="grid min-h-80 place-items-center gap-3 p-8 text-center">
            <p className="m-0 text-sm font-semibold text-[#5d4c59]">
              No pudimos cargar el inventario.
            </p>
            <button
              className="rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <p className="m-0 text-base font-bold text-[#302630]">
                No hay materiales para mostrar
              </p>
              <p className="mt-2 mb-0 text-sm text-[#806f7d]">
                Prueba con otra búsqueda o cambia el estado seleccionado.
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={items} />
        )}
        <footer className="flex items-center justify-between border-t border-[#eee2eb] px-5 py-4 text-sm text-[#5f525d]">
          <span>
            {meta ? `Mostrando ${showFrom}-${showTo} de ${meta.total}` : ""}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Página anterior"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Página siguiente"
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
      {movementItem ? (
        <MovementDrawer
          item={movementItem}
          onClose={() => setMovementItem(null)}
        />
      ) : null}
    </main>
  );
}
