import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Confirmation } from "../components/Confirmation.tsx";
import { DataTable } from "../components/DataTable.tsx";
import type { appTableFeatures } from "../components/tableConfig.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { ApiError } from "../lib/api.ts";
import {
  useInventoryItem,
  useInventoryItems,
  useInventoryMutations,
} from "./api.ts";
import { MovementDrawer } from "./components/MovementDrawer.tsx";
import { formatInventoryQuantity } from "./formatters.ts";
import type {
  InventoryItem,
  InventorySort,
  InventoryTab,
  SortOrder,
  StockMovementType,
} from "./types.ts";

const tabs: { label: string; value: InventoryTab }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Stock suficiente", value: "sufficient" },
  { label: "Stock bajo", value: "low" },
  { label: "Agotado", value: "out" },
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
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const rawTab = searchParams.get("tab");
  const tab: InventoryTab =
    rawTab === "all" ||
    rawTab === "inactive" ||
    rawTab === "sufficient" ||
    rawTab === "low" ||
    rawTab === "out"
      ? rawTab
      : "active";
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawSort = searchParams.get("sortBy");
  const sortBy: InventorySort =
    rawSort === "sku" || rawSort === "quantity" ? rawSort : "name";
  const order: SortOrder =
    searchParams.get("order") === "desc" ? "desc" : "asc";
  const movementItemId = searchParams.get("movementItem");
  const rawMovementType = searchParams.get("movementType");
  const movementType: StockMovementType | undefined = [
    "RECEIPT",
    "ISSUE",
    "SALE",
    "ADJUSTMENT",
    "RETURN",
  ].includes(rawMovementType ?? "")
    ? (rawMovementType as StockMovementType)
    : undefined;
  const movementOrder: SortOrder =
    searchParams.get("movementOrder") === "asc" ? "asc" : "desc";
  const movementPageValue = Number(searchParams.get("movementPage") ?? "1");
  const movementPage =
    Number.isInteger(movementPageValue) && movementPageValue > 0
      ? movementPageValue
      : 1;

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
  const { deactivate, restore } = useInventoryMutations();
  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  const itemFromList = items.find((item) => item.id === movementItemId);
  const movementItemQuery = useInventoryItem(
    movementItemId && !itemFromList ? movementItemId : undefined,
  );
  const movementItem = itemFromList ?? movementItemQuery.data ?? null;

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

  const updateMovementParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const openMovement = useCallback(
    (item: InventoryItem) => {
      updateMovementParams({
        movementItem: item.id,
        movementType: undefined,
        movementOrder: "desc",
        movementPage: "1",
      });
    },
    [updateMovementParams],
  );

  function closeMovement() {
    updateMovementParams({
      movementItem: undefined,
      movementType: undefined,
      movementOrder: undefined,
      movementPage: undefined,
    });
  }

  const changeItemStatus = useCallback(
    (item: InventoryItem, inactive: boolean) => {
      const runMutation = () => {
        const mutation = inactive ? restore : deactivate;
        void mutation
          .mutateAsync(item.id)
          .then(() =>
            toast.success(
              inactive ? "Material activado." : "Material desactivado.",
            ),
          )
          .catch((error: unknown) =>
            toast.error(
              error instanceof ApiError
                ? error.message
                : inactive
                  ? "No se pudo activar el material."
                  : "No se pudo desactivar el material.",
            ),
          );
      };

      if (inactive) {
        runMutation();
        return;
      }

      toast.custom(
        (confirmation) => (
          <Confirmation
            title="¿Desactivar material?"
            text={`${item.name} dejará de aparecer entre los materiales activos.`}
            confirm="Desactivar"
            onClose={() => toast.remove(confirmation.id)}
            onConfirm={() => {
              toast.remove(confirmation.id);
              runMutation();
            }}
          />
        ),
        { duration: 8000, position: "top-center" },
      );
    },
    [deactivate, restore],
  );

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
            <button
              aria-label="Ver material"
              className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
              onClick={() => navigate(`/inventario/${row.original.id}`)}
              type="button"
            >
              <Eye size={17} />
            </button>
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
            <button
              aria-label="Ver movimientos del material"
              className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5]"
              onClick={() => openMovement(row.original)}
              type="button"
            >
              <ArrowLeftRight size={17} />
            </button>
            <button
              aria-label={
                row.original.deletedAt
                  ? "Activar material"
                  : "Desactivar material"
              }
              className="cursor-pointer rounded-md p-2 text-[#8b5e83] hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deactivate.isPending || restore.isPending}
              onClick={() =>
                changeItemStatus(row.original, Boolean(row.original.deletedAt))
              }
              type="button"
            >
              {row.original.deletedAt ? (
                <RotateCcw size={17} />
              ) : (
                <Trash2 size={17} />
              )}
            </button>
          </div>
        ),
      },
    ],
    [
      changeItemStatus,
      deactivate.isPending,
      navigate,
      openMovement,
      restore.isPending,
    ],
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
            className="flex flex-wrap gap-2 rounded-xl bg-[#f8f0f7] p-1"
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
      {movementItemId ? (
        <MovementDrawer
          item={movementItem}
          itemLoading={!movementItem && movementItemQuery.isPending}
          itemError={!movementItem && movementItemQuery.isError}
          onRetryItem={() => void movementItemQuery.refetch()}
          history={{
            page: movementPage,
            type: movementType,
            order: movementOrder,
          }}
          onHistoryChange={(updates) => {
            const next: Record<string, string | undefined> = {};
            if ("type" in updates) {
              next.movementType = updates.type;
            }
            if ("order" in updates) {
              next.movementOrder = updates.order;
            }
            if ("page" in updates) {
              next.movementPage =
                updates.page === undefined ? undefined : String(updates.page);
            }
            updateMovementParams(next);
          }}
          onClose={closeMovement}
        />
      ) : null}
    </main>
  );
}
