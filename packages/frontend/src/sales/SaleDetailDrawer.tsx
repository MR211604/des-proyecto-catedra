import { Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { type SubmitEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Confirmation } from "../components/Confirmation.tsx";
import { ApiError } from "../lib/api.ts";
import { useSale, useSaleMutations, useSalePayments } from "./api.ts";
import { paymentMethodOptions, paymentStatusClasses } from "./constants.ts";
import {
  formatSaleDateTime,
  formatSaleMoney,
  paymentMethodLabel,
  paymentStatus,
} from "./formatters.ts";
import type { Payment, PaymentMethod } from "./types.ts";

function isValidAmount(value: string) {
  return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) > 0;
}

export function SaleDetailDrawer({
  saleId,
  onClose,
}: {
  saleId: string;
  onClose: () => void;
}) {
  const saleQuery = useSale(saleId);
  const paymentsQuery = useSalePayments(saleId);
  const { createPayment, updatePayment, deletePayment } = useSaleMutations();
  const sale = saleQuery.data;

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    if (prefilled.current || !sale) return;
    prefilled.current = true;
    setAmount(sale.outstandingBalance);
  }, [sale]);

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

  const voided = sale?.status === "VOIDED";
  const editingPayment = editingId
    ? (sale?.payments.find((payment) => payment.id === editingId) ?? null)
    : null;
  const maxAmount = sale
    ? Number(sale.outstandingBalance) +
      (editingPayment ? Number(editingPayment.amount) : 0)
    : 0;
  const canRegister =
    Boolean(sale) &&
    !voided &&
    (Number(sale?.outstandingBalance ?? 0) > 0 || editingPayment !== null);
  const saving = createPayment.isPending || updatePayment.isPending;

  function startEdit(payment: Payment) {
    setEditingId(payment.id);
    setAmount(payment.amount);
    setMethod(payment.method);
    setReference(payment.reference ?? "");
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setMethod("CASH");
    setReference("");
    setError(null);
    setAmount(sale?.outstandingBalance ?? "");
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sale) return;
    setError(null);

    const trimmed = amount.trim();
    if (!isValidAmount(trimmed)) {
      setError("El monto debe ser mayor a cero y tener hasta 2 decimales.");
      return;
    }
    if (Number(trimmed) > maxAmount + 0.005) {
      setError(
        `El monto no puede superar ${formatSaleMoney(String(maxAmount))}.`,
      );
      return;
    }

    try {
      const result = editingPayment
        ? await updatePayment.mutateAsync({
            saleId,
            paymentId: editingPayment.id,
            input: {
              amount: trimmed,
              method,
              reference: reference.trim() ? reference.trim() : null,
            },
          })
        : await createPayment.mutateAsync({
            saleId,
            input: {
              amount: trimmed,
              method,
              ...(reference.trim() ? { reference: reference.trim() } : {}),
            },
          });
      toast.success(editingPayment ? "Pago actualizado." : "Pago registrado.");
      setEditingId(null);
      setMethod("CASH");
      setReference("");
      setError(null);
      setAmount(result.sale.outstandingBalance);
    } catch (caught: unknown) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "No se pudo guardar el pago.",
      );
    }
  }

  function confirmDelete(payment: Payment) {
    toast.custom(
      (confirmation) => (
        <Confirmation
          title="¿Eliminar pago?"
          text={`Se eliminará un pago de ${formatSaleMoney(payment.amount)}.`}
          confirm="Eliminar"
          onClose={() => toast.remove(confirmation.id)}
          onConfirm={() => {
            toast.remove(confirmation.id);
            if (deletePayment.isPending) return;
            void deletePayment
              .mutateAsync({ saleId, paymentId: payment.id })
              .then((result) => {
                if (editingId === payment.id) resetForm();
                else setAmount(result.sale.outstandingBalance);
                toast.success("Pago eliminado.");
              })
              .catch((caught: unknown) =>
                toast.error(
                  caught instanceof ApiError
                    ? caught.message
                    : "No se pudo eliminar el pago.",
                ),
              );
          }}
        />
      ),
      { duration: 8000, position: "top-center" },
    );
  }

  const payments = paymentsQuery.data?.data ?? [];
  const paymentTotal = paymentsQuery.data?.meta.total ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#211b21]/35">
      <button
        aria-label="Cerrar detalle de la venta"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Detalle de la venta"
        aria-modal="true"
        className="relative flex h-full w-full max-w-140 flex-col overflow-y-auto bg-[#fffafd] shadow-[-12px_0_40px_rgba(74,46,71,0.2)]"
        ref={drawer}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eadfe8] px-6 py-6">
          <div>
            <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#98728f]">
              <Eye size={15} /> Control de ventas
            </p>
            <h2 className="mt-2 mb-0 text-2xl font-bold text-[#211b21]">
              Detalle de la venta
            </h2>
            {sale ? (
              <p className="mt-2 mb-0 text-sm text-[#6f616d]">
                ORD-{sale.number} · {sale.order.client.name}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Cerrar detalle de la venta"
            className="cursor-pointer rounded-md p-2 text-[#6f616d] hover:bg-[#f6edf5]"
            onClick={onClose}
            ref={closeButton}
            type="button"
          >
            <X size={21} />
          </button>
        </header>

        {saleQuery.isPending ? (
          <p className="p-6 text-sm text-[#806f7d]">Cargando la venta...</p>
        ) : null}
        {saleQuery.isError ? (
          <div className="m-6 grid gap-3 rounded-lg bg-[#fff1f1] p-4 text-sm text-[#a32626]">
            <p className="m-0">No se pudo cargar el detalle de la venta.</p>
            <button
              className="w-fit rounded-lg bg-[#8b5e83] px-3 py-2 text-xs font-bold text-white"
              onClick={() => void saleQuery.refetch()}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {sale ? (
          <div className="grid gap-6 p-6">
            <section className="rounded-xl border border-[#e5cddd] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 font-mono text-xs font-bold text-[#98728f]">
                    ORD-{sale.number}
                  </p>
                  <h3 className="mt-2 mb-0 text-xl font-bold text-[#211b21]">
                    {sale.order.client.name}
                  </h3>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold ${paymentStatusClasses[paymentStatus(sale)]}`}
                >
                  {paymentStatus(sale)}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#eadfe8] pt-4 text-center">
                <div>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#98728f]">
                    Total
                  </p>
                  <p className="mt-1 mb-0 text-sm font-bold text-[#302630]">
                    {formatSaleMoney(sale.total)}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#98728f]">
                    Pagado
                  </p>
                  <p className="mt-1 mb-0 text-sm font-bold text-[#302630]">
                    {formatSaleMoney(sale.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#98728f]">
                    Saldo
                  </p>
                  <p className="mt-1 mb-0 text-sm font-bold text-[#302630]">
                    {formatSaleMoney(sale.outstandingBalance)}
                  </p>
                </div>
              </div>
            </section>

            {voided ? (
              <p className="m-0 rounded-lg bg-[#f8f0f7] p-4 text-sm text-[#6f616d]">
                Esta venta está anulada. El historial se muestra en modo
                consulta.
              </p>
            ) : canRegister ? (
              <section className="rounded-xl border border-[#eadfe8] bg-[#fffafd] p-5">
                <h3 className="m-0 text-base font-bold text-[#302630]">
                  {editingPayment ? "Editar pago" : "Registrar pago"}
                </h3>
                <form className="mt-5 grid gap-4" onSubmit={submit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
                      Monto
                      <input
                        className={`h-11 border bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${error ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                        min="0.01"
                        onChange={(event) => setAmount(event.target.value)}
                        step="0.01"
                        type="number"
                        value={amount}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
                      Método
                      <select
                        className="h-11 border border-[#9b9aa2] bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                        onChange={(event) =>
                          setMethod(event.target.value as PaymentMethod)
                        }
                        value={method}
                      >
                        {paymentMethodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="m-0 text-xs text-[#806f7d]">
                    {editingPayment
                      ? `Máximo editable: ${formatSaleMoney(String(maxAmount))}.`
                      : `Saldo pendiente: ${formatSaleMoney(String(maxAmount))}.`}
                  </p>
                  <label className="grid gap-2 text-sm font-semibold text-[#211b21]">
                    Referencia{" "}
                    <span className="font-normal text-[#806f7d]">
                      (opcional)
                    </span>
                    <input
                      className="h-11 border border-[#9b9aa2] bg-white px-3 font-normal text-[#4d4350] outline-none focus:border-[#8b5e83]"
                      maxLength={200}
                      onChange={(event) => setReference(event.target.value)}
                      value={reference}
                    />
                  </label>
                  {error ? (
                    <p className="m-0 text-sm text-[#a32626]">{error}</p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[#8b5e83] px-4 font-bold text-white hover:bg-[#70466a] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={saving}
                      type="submit"
                    >
                      <Plus size={17} />
                      {editingPayment
                        ? saving
                          ? "Guardando..."
                          : "Guardar cambios"
                        : saving
                          ? "Registrando..."
                          : "Registrar pago"}
                    </button>
                    {editingPayment ? (
                      <button
                        className="cursor-pointer rounded-lg border-0 bg-transparent px-4 py-3 text-sm font-bold text-[#806f7d] hover:bg-[#f6edf5]"
                        onClick={resetForm}
                        type="button"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </form>
              </section>
            ) : (
              <p className="m-0 rounded-lg bg-[#f8f0f7] p-4 text-sm text-[#6f616d]">
                Esta venta está totalmente pagada. No queda saldo pendiente por
                registrar.
              </p>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-[#70466a]">
                  Historial de pagos
                </h3>
                <span className="text-xs text-[#806f7d]">{paymentTotal}</span>
              </div>
              {paymentsQuery.isPending ? (
                <p className="m-0 text-sm text-[#806f7d]">Cargando pagos...</p>
              ) : null}
              {paymentsQuery.isError ? (
                <div className="grid gap-3 rounded-lg bg-[#fff1f1] p-3 text-sm text-[#a32626]">
                  <p className="m-0">
                    No se pudo cargar el historial de pagos.
                  </p>
                  <button
                    className="w-fit rounded-lg bg-[#8b5e83] px-3 py-2 text-xs font-bold text-white"
                    onClick={() => void paymentsQuery.refetch()}
                    type="button"
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}
              {paymentsQuery.data && payments.length === 0 ? (
                <p className="m-0 rounded-lg bg-[#fbf0fa] p-3 text-sm text-[#806f7d]">
                  Esta venta aún no tiene pagos registrados.
                </p>
              ) : null}
              <div className="grid gap-2">
                {payments.map((payment) => (
                  <article
                    className={`rounded-lg border bg-white p-3 ${editingId === payment.id ? "border-[#8b5e83]" : "border-[#eadfe8]"}`}
                    key={payment.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 text-sm font-bold text-[#302630]">
                          {formatSaleMoney(payment.amount)}
                        </p>
                        <p className="mt-1 mb-0 text-xs text-[#806f7d]">
                          {paymentMethodLabel(payment.method)} ·{" "}
                          {formatSaleDateTime(payment.paidAt)}
                        </p>
                        {payment.reference ? (
                          <p className="mt-1 mb-0 text-xs text-[#5b4b58]">
                            Ref: {payment.reference}
                          </p>
                        ) : null}
                      </div>
                      {!voided ? (
                        <div className="flex shrink-0 gap-1">
                          <button
                            aria-label={`Editar pago de ${formatSaleMoney(payment.amount)}`}
                            className="cursor-pointer rounded-md p-2 text-[#766774] hover:bg-[#f6edf5]"
                            onClick={() => startEdit(payment)}
                            type="button"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            aria-label={`Eliminar pago de ${formatSaleMoney(payment.amount)}`}
                            className="cursor-pointer rounded-md p-2 text-[#766774] hover:bg-[#fff1f2] hover:text-[#9c3042]"
                            onClick={() => confirmDelete(payment)}
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              {paymentTotal > 10 ? (
                <p className="mt-3 mb-0 text-xs text-[#806f7d]">
                  Mostrando los últimos 10 de {paymentTotal}.
                </p>
              ) : null}
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
