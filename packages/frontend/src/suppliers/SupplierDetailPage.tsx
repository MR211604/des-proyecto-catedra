import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Confirmation } from "../components/Confirmation.tsx";
import { formatInventoryQuantity } from "../inventory/formatters.ts";
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts";
import { ApiError } from "../lib/api.ts";
import { useSupplier, useSupplierMutations } from "./api.ts";
import { formatSupplierDate } from "./formatters.ts";
import type { SupplierItemTab } from "./types.ts";

const tabs: { label: string; value: SupplierItemTab }[] = [
  { label: "Todos", value: "all" },
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

export function SupplierDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { deactivate, restore } = useSupplierMutations();
  const rawTab = searchParams.get("tab");
  const itemTab: SupplierItemTab =
    rawTab === "all" || rawTab === "inactive" ? rawTab : "active";
  const pageValue = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

  useEffect(() => {
    const urlSearch = searchParams.get("search") ?? "";
    setSearchInput((currentSearch) =>
      currentSearch === urlSearch ? currentSearch : urlSearch,
    );
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

  const supplierQuery = useSupplier(id, {
    page,
    limit: 20,
    search: debouncedSearch,
    status: itemTab,
  });
  const supplier = supplierQuery.data;
  const items = supplier?.items ?? [];
  const meta = supplier?.itemsMeta;

  useEffect(() => {
    if (supplierQuery.error) toast.error("No se pudo cargar el proveedor.");
  }, [supplierQuery.error]);

  function changeItemTab(tab: SupplierItemTab) {
    const next = new URLSearchParams(searchParams);
    if (tab === "active") next.delete("tab");
    else next.set("tab", tab);
    next.set("page", "1");
    setSearchParams(next, { replace: true });
  }

  function restoreSupplier() {
    if (!id) return;
    void restore
      .mutateAsync(id)
      .then(() => toast.success("Proveedor restaurado."))
      .catch((error: unknown) =>
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo restaurar el proveedor.",
        ),
      );
  }

  function deactivateSupplier() {
    if (!id || !supplier) return;
    const runMutation = () => {
      void deactivate
        .mutateAsync(id)
        .then(() => toast.success("Proveedor desactivado."))
        .catch((error: unknown) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "No se pudo desactivar el proveedor.",
          ),
        );
    };

    toast.custom(
      (confirmation) => (
        <Confirmation
          title="¿Desactivar proveedor?"
          text={`${supplier.name} conservará sus materiales asociados, pero dejará de estar disponible para nuevas asignaciones.`}
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
  }

  if (supplierQuery.isPending) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-sm text-[#806f7d]">
        Cargando proveedor...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="m-0 text-base font-bold text-[#302630]">
            No se pudo cargar el proveedor.
          </p>
          <button
            className="mt-4 rounded-lg bg-[#8b5e83] px-4 py-2 text-sm font-bold text-white"
            onClick={() => navigate("/proveedores")}
            type="button"
          >
            Volver a proveedores
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-360 px-10 py-9.5 pb-14 max-[1100px]:px-6 max-[820px]:px-4 max-[820px]:py-7">
      <button
        className="mb-7 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-sm font-bold text-[#5f525d] hover:text-[#70466a]"
        onClick={() => navigate("/proveedores")}
        type="button"
      >
        <ArrowLeft size={18} /> Volver a proveedores
      </button>

      <header className="mb-7 flex items-start justify-between gap-4 max-[700px]:flex-col">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#98728f]">
            <Truck size={16} /> Ficha del proveedor
          </p>
          <h1 className="m-0 text-[clamp(32px,4vw,46px)] font-bold tracking-[-1.8px] text-[#211b21]">
            {supplier.name}
          </h1>
          <p className="mt-2 mb-0 text-sm text-[#786d77]">
            {supplier.phone ?? "Sin teléfono"}
            {supplier.email ? ` · ${supplier.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supplier.deletedAt ? (
            <button
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#8b5e83] bg-white px-4 text-sm font-bold text-[#70466a] disabled:opacity-50"
              disabled={restore.isPending}
              onClick={restoreSupplier}
              type="button"
            >
              <RotateCcw size={17} />
              {restore.isPending ? "Restaurando..." : "Restaurar proveedor"}
            </button>
          ) : (
            <>
              <button
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-4 text-sm font-bold text-[#70466a] hover:bg-[#f6edf5]"
                onClick={() => navigate(`/proveedores/${supplier.id}/editar`)}
                type="button"
              >
                <Pencil size={17} /> Editar
              </button>
              <button
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-4 text-sm font-bold text-[#70466a] hover:bg-[#f6edf5] disabled:opacity-50"
                disabled={deactivate.isPending}
                onClick={deactivateSupplier}
                type="button"
              >
                <Trash2 size={17} /> Desactivar
              </button>
            </>
          )}
        </div>
      </header>

      <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado">
          <span
            className={`inline-flex rounded-md px-3 py-1.5 text-xs font-bold ${supplier.deletedAt ? "bg-[#eee8ed] text-[#625660]" : "bg-[#f2e6f1] text-[#805276]"}`}
          >
            {supplier.deletedAt ? "Inactivo" : "Activo"}
          </span>
        </InfoCard>
        <InfoCard label="Fecha de contratación">
          {formatSupplierDate(supplier.createdAt)}
        </InfoCard>
        <InfoCard label="Fecha de rescisión">
          {formatSupplierDate(supplier.deletedAt)}
        </InfoCard>
        <InfoCard label="Materiales asociados">
          {supplier.itemsCount}
        </InfoCard>
      </section>

      <section className="mb-7 rounded-2xl border border-[#eadde7] bg-[#fffafd] p-5">
        <h2 className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#70466a]">
          Notas
        </h2>
        <p className="mt-3 mb-0 text-sm leading-6 text-[#514750]">
          {supplier.notes || "Este proveedor aún no tiene notas registradas."}
        </p>
      </section>

      <section className="rounded-2xl border border-[#eadde7] bg-[#fffafd] shadow-[0_18px_45px_-35px_#70466a]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee2eb] px-5 py-5">
          <div>
            <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-[#302630]">
              <Package size={20} /> Materiales asociados
            </h2>
            <p className="mt-1 mb-0 text-xs text-[#806f7d]">
              {meta?.total ?? 0} {meta?.total === 1 ? "material" : "materiales"} en
              esta vista
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <label className="flex h-10 min-w-60 items-center gap-2 rounded-lg border border-[#dfcedc] bg-white px-3 text-[#8d7888] focus-within:border-[#8b5e83] max-[620px]:w-full">
              <Search size={17} />
              <span className="sr-only">Buscar materiales</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#302630] outline-none placeholder:text-[#ab9ca8]"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre o SKU..."
                value={searchInput}
              />
            </label>
            <div
              aria-label="Estado de materiales"
              className="flex gap-2 rounded-xl bg-[#f8f0f7] p-1"
              role="tablist"
            >
              {tabs.map((tab) => (
                <button
                  aria-selected={itemTab === tab.value}
                  className={`rounded-lg border-0 px-3 py-2 text-xs font-bold transition ${itemTab === tab.value ? "bg-white text-[#70466a] shadow-sm" : "bg-transparent text-[#8a7886]"}`}
                  key={tab.value}
                  onClick={() => changeItemTab(tab.value)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {supplierQuery.isFetching ? (
          <div className="grid min-h-56 place-items-center p-8 text-sm text-[#806f7d]">
            Cargando materiales...
          </div>
        ) : items.length === 0 ? (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <p className="m-0 text-sm text-[#806f7d]">
              {debouncedSearch
                ? "No se encontraron materiales con esa búsqueda."
                : "No hay materiales para el estado seleccionado."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 border-collapse text-left">
              <thead className="bg-[#fcf9fb]">
                <tr>
                  {[
                    "Nombre",
                    "SKU",
                    "Unidad",
                    "Cantidad disponible",
                    "Punto de reorden",
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
                {items.map((item) => (
                  <tr
                    className="border-b border-[#f1e7ef] last:border-b-0"
                    key={item.id}
                  >
                    <td className="px-5 py-4 font-semibold text-[#302630]">
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#5f525d]">
                      {item.sku ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#5f525d]">
                      {item.unit}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-[#302630]">
                      {formatInventoryQuantity(item.quantity, item.unit)}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#5f525d]">
                      {formatInventoryQuantity(item.reorderPoint, item.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-[#eee2eb] px-5 py-4 text-sm text-[#5f525d]">
          <span>
            {meta && meta.total > 0
              ? `Mostrando ${(meta.page - 1) * meta.limit + 1}-${Math.min(meta.page * meta.limit, meta.total)} de ${meta.total}`
              : meta
                ? "No hay materiales para mostrar"
                : ""}
          </span>
          <div className="flex gap-1">
            <button
              aria-label="Página anterior"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page - 1));
                setSearchParams(next, { replace: true });
              }}
              type="button"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Página siguiente"
              className="rounded-md p-2 hover:bg-[#f6edf5] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!meta || page >= meta.totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("page", String(page + 1));
                setSearchParams(next, { replace: true });
              }}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function InfoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#eadde7] bg-white p-4">
      <p className="m-0 text-xs font-bold uppercase tracking-[0.1em] text-[#806f7d]">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-[#302630]">
        {children}
      </div>
    </div>
  );
}
