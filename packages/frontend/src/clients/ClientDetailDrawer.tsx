import { Eye, Pencil, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useClient, useClientMutations, useClientOrders } from "./api.ts";
import { formatClientDate } from "./formatters.ts";

const measurementLabels = {
  chest: "Pecho",
  waist: "Cintura",
  hips: "Cadera",
  sleeveLength: "Largo de manga",
  garmentLength: "Largo total",
  shoulders: "Hombros",
} as const;

const orderStatusLabels = {
  CONFIRMED: "Confirmado",
  IN_PRODUCTION: "En producción",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
} as const;

function orderTotal(items: Array<{ total: string }>) {
  return items
    .reduce((total, item) => total + Number(item.total), 0)
    .toFixed(2);
}

export function ClientDetailDrawer({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const clientQuery = useClient(clientId);
  const ordersQuery = useClientOrders(clientId);
  const { restore } = useClientMutations();
  const [restoring, setRestoring] = useState(false);
  const client = clientQuery.data;
  const drawer = useRef<HTMLElement>(null);

  function restoreClient() {
    setRestoring(true);
    void restore
      .mutateAsync(clientId)
      .then(() => toast.success("Cliente restaurado."))
      .catch((error: unknown) =>
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo restaurar el cliente.",
        ),
      )
      .finally(() => setRestoring(false));
  }

  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = drawer.current.querySelectorAll<HTMLElement>(
        "button, a, input, textarea, select, [tabindex]:not([tabindex='-1'])",
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#211b21]/25">
      <button
        aria-label="Cerrar detalle del cliente"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Detalle del cliente"
        aria-modal="true"
        className="relative h-full w-full max-w-[430px] overflow-y-auto bg-[#fffafd] p-5 shadow-2xl sm:p-7"
        ref={drawer}
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#98728f]">
            <Eye size={16} /> Ficha del cliente
          </div>
          <button
            aria-label="Cerrar detalle del cliente"
            className="rounded-md p-2 text-[#766774] hover:bg-[#f6edf5] cursor-pointer"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {clientQuery.isPending ? (
          <div className="grid min-h-80 place-items-center text-sm text-[#806f7d]">
            Cargando ficha...
          </div>
        ) : null}
        {clientQuery.isError || !client ? (
          <div className="grid min-h-80 place-items-center text-center text-sm text-[#806f7d]">
            No se pudo cargar la ficha del cliente.
          </div>
        ) : null}
        {client ? (
          <>
            <header className="rounded-xl border border-[#e5cddd] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-lg font-bold text-[#211b21]">
                    {client.name}
                  </h2>
                  <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                    {client.phone} {client.email ? `· ${client.email}` : ""}
                  </p>
                  <p className="mt-1 mb-0 text-[11px] text-[#98728f]">
                    Registro: {formatClientDate(client.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-bold ${client.deletedAt ? "bg-[#eee8ed] text-[#625660]" : "bg-[#f2e6f1] text-[#805276]"}`}
                >
                  {client.deletedAt ? "Inactivo" : "Activo"}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                {client.deletedAt ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-[#8b5e83] px-3 py-2 text-xs font-bold text-[#70466a] disabled:opacity-50"
                    disabled={restoring}
                    onClick={restoreClient}
                    type="button"
                  >
                    <RotateCcw size={14} />{" "}
                    {restoring ? "Restaurando..." : "Restaurar cliente"}
                  </button>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-[#8b5e83] px-3 py-2 text-xs font-bold text-[#70466a] hover:bg-[#f6edf5] cursor-pointer"
                    onClick={() => navigate(`/clientes/${client.id}/editar`)}
                    type="button"
                  >
                    <Pencil size={14} /> Editar ficha
                  </button>
                )}
              </div>
            </header>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#70466a]">
                  Preferencias
                </h3>
              </div>
              <p className="m-0 rounded-lg bg-[#fbf0fa] p-3 text-sm leading-6 text-[#514750]">
                {client.notes ||
                  "Este cliente aún no tiene preferencias registradas."}
              </p>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#70466a]">
                  Últimas medidas
                </h3>
                <span className="text-xs text-[#806f7d]">
                  {client.measurements?.unit ?? "cm"}
                </span>
              </div>
              {client.measurements &&
              Object.keys(client.measurements.values).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(client.measurements.values).map(
                    ([key, value]) => (
                      <div
                        className="rounded-lg bg-[#fbf0fa] px-3 py-2"
                        key={key}
                      >
                        <p className="m-0 text-[11px] text-[#806f7d]">
                          {measurementLabels[
                            key as keyof typeof measurementLabels
                          ] ?? key}
                        </p>
                        <p className="mt-1 mb-0 text-sm font-bold text-[#3d343d]">
                          {value} {client.measurements?.unit}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="m-0 rounded-lg bg-[#fbf0fa] p-3 text-sm text-[#806f7d]">
                  Este cliente aún no tiene medidas registradas.
                </p>
              )}
              {client.measurements?.notes ? (
                <p className="mt-3 mb-0 text-xs italic text-[#806f7d]">
                  {client.measurements.notes}
                </p>
              ) : null}
            </section>

            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#70466a]">
                  Historial de pedidos
                </h3>
                <span className="text-xs text-[#806f7d]">
                  {ordersQuery.data?.meta.total ?? ""}
                </span>
              </div>
              {ordersQuery.isPending ? (
                <p className="m-0 text-sm text-[#806f7d]">
                  Cargando pedidos...
                </p>
              ) : null}
              {ordersQuery.isError ? (
                <p className="m-0 rounded-lg bg-[#fff1f2] p-3 text-sm text-[#9a4050]">
                  No se pudo cargar el historial de pedidos.
                </p>
              ) : null}
              {ordersQuery.data && ordersQuery.data.data.length === 0 ? (
                <p className="m-0 rounded-lg bg-[#fbf0fa] p-3 text-sm text-[#806f7d]">
                  Este cliente aún no tiene pedidos.
                </p>
              ) : null}
              <div className="grid gap-2">
                {ordersQuery.data?.data.map((order) => (
                  <div
                    className="rounded-lg border border-[#eadde7] bg-white p-3"
                    key={order.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-xs text-[#3d343d]">
                        ORD-{order.number}
                      </strong>
                      <span className="text-[11px] text-[#806f7d]">
                        {formatClientDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="rounded bg-[#f2e6f1] px-2 py-1 text-[11px] font-semibold text-[#805276]">
                        {orderStatusLabels[order.status]}
                      </span>
                      <span className="text-sm font-bold text-[#3d343d]">
                        ${orderTotal(order.items)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
}
