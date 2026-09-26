import { useForm } from "@tanstack/react-form";
import { ArrowLeft, FileText, ListChecks } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api.ts";
import { useOrder } from "../orders/api.ts";
import { statusClasses, statusLabels } from "../orders/constants.ts";
import type { OrderDetail } from "../orders/types.ts";
import { useSaleFormOptions, useSaleMutations } from "./api.ts";
import { formatSaleDate, formatSaleMoney } from "./formatters.ts";
import type { SaleInput } from "./types.ts";

type FormState = {
  orderId: string;
};

const emptyForm: FormState = {
  orderId: "",
};

function orderTotal(order: OrderDetail) {
  return order.items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );
}

function OrderPreview({ orderId }: { orderId: string }) {
  const orderQuery = useOrder(orderId || undefined);

  if (!orderId) {
    return (
      <p className="m-0 text-sm text-[#806f7d]">
        Selecciona un pedido para ver el resumen de la venta.
      </p>
    );
  }

  if (orderQuery.isPending) {
    return <p className="m-0 text-sm text-[#806f7d]">Cargando pedido...</p>;
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <p className="m-0 text-sm text-[#806f7d]">
        No se pudo cargar el resumen del pedido.
      </p>
    );
  }

  const order = orderQuery.data;

  return (
    <div className="rounded-lg bg-[#fbf0fa] p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#98728f]">
            Cliente
          </p>
          <p className="mt-1 mb-0 text-sm font-semibold text-[#211b21]">
            {order.client.name}
          </p>
        </div>
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#98728f]">
            Estado del pedido
          </p>
          <p className="mt-1 mb-0">
            <span
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${statusClasses[order.status]}`}
            >
              {statusLabels[order.status]}
            </span>
          </p>
        </div>
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-[#98728f]">
            Fecha del pedido
          </p>
          <p className="mt-1 mb-0 text-sm font-semibold text-[#211b21]">
            {formatSaleDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b border-[#eadde7] py-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-[#766774]">
                Concepto
              </th>
              <th className="border-b border-[#eadde7] py-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-[#766774]">
                Cantidad
              </th>
              <th className="border-b border-[#eadde7] py-2 pr-4 text-xs font-bold uppercase tracking-[0.12em] text-[#766774]">
                Precio unitario
              </th>
              <th className="border-b border-[#eadde7] py-2 text-right text-xs font-bold uppercase tracking-[0.12em] text-[#766774]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-[#f1e7ef] py-3 pr-4 text-sm text-[#3d343d]">
                  {item.description}
                </td>
                <td className="border-b border-[#f1e7ef] py-3 pr-4 text-sm text-[#3d343d]">
                  {item.quantity}
                </td>
                <td className="border-b border-[#f1e7ef] py-3 pr-4 text-sm text-[#3d343d]">
                  {formatSaleMoney(item.unitPrice)}
                </td>
                <td className="border-b border-[#f1e7ef] py-3 text-right text-sm font-semibold text-[#3d343d]">
                  {formatSaleMoney(
                    String(Number(item.quantity) * Number(item.unitPrice)),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#eadde7] pt-4">
        <span className="text-sm font-bold text-[#70466a]">Total</span>
        <span className="text-lg font-bold text-[#211b21]">
          {formatSaleMoney(String(orderTotal(order)))}
        </span>
      </div>
    </div>
  );
}

export function SaleFormPage() {
  const navigate = useNavigate();
  const options = useSaleFormOptions();
  const { create } = useSaleMutations();
  const existingOrderIds = new Set(
    (options.sales.data ?? []).map((sale) => sale.orderId),
  );
  const eligibleOrders = (options.orders.data ?? []).filter(
    (order) => order.status !== "CANCELLED" && !existingOrderIds.has(order.id),
  );
  const optionsLoading = options.orders.isPending || options.sales.isPending;
  const form = useForm({
    defaultValues: emptyForm,
    onSubmit: async ({ value }) => {
      const input: SaleInput = { orderId: value.orderId };
      try {
        await create.mutateAsync(input);
        toast.success("Venta registrada.");
        navigate("/ventas");
      } catch (error: unknown) {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "No se pudo registrar la venta.",
        );
      }
    },
  });

  const saving = create.isPending || form.state.isSubmitting;

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f8f5f7] px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-250">
        <button
          className="mb-8 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-lg text-[#3d343d]"
          onClick={() => navigate("/ventas")}
          type="button"
        >
          <ArrowLeft size={20} /> Volver a ventas
        </button>
        <form
          className="rounded-xl bg-white px-6 py-8 shadow-[0_10px_35px_-25px_#70466a] sm:px-9"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <header className="border-b border-[#eee2eb] pb-7">
            <h1 className="m-0 text-3xl font-bold tracking-[-1px] text-[#171318] sm:text-4xl">
              Registrar Nueva Venta
            </h1>
            <p className="mt-2 mb-0 text-base text-[#514750]">
              Registra la venta a partir de un pedido existente. La venta
              conserva los conceptos y el total del pedido.
            </p>
          </header>

          <section className="border-b border-[#eee2eb] py-8">
            <h2 className="mb-7 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <FileText size={23} /> Información de la venta
            </h2>
            <label
              className="relative grid w-full max-w-140 gap-2 text-sm font-semibold text-[#211b21]"
              htmlFor="sale-order"
            >
              <span>
                Pedido <span className="text-[#b34b5d]">*</span>
              </span>
              <form.Field
                name="orderId"
                validators={{
                  onSubmit: ({ value }) =>
                    value ? undefined : "Selecciona un pedido.",
                }}
              >
                {(field) => (
                  <>
                    <select
                      className={`h-12 border bg-white px-3 text-base font-normal text-[#4d4350] outline-none focus:border-[#8b5e83] ${field.state.meta.errors[0] ? "border-[#b34b5d]" : "border-[#9b9aa2]"}`}
                      disabled={optionsLoading}
                      id="sale-order"
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      value={field.state.value}
                    >
                      <option value="">
                        {optionsLoading
                          ? "Cargando pedidos..."
                          : eligibleOrders.length === 0
                            ? "No hay pedidos disponibles"
                            : "Selecciona un pedido"}
                      </option>
                      {eligibleOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          ORD-{order.number} · {order.client.name}
                        </option>
                      ))}
                    </select>
                    {field.state.meta.errors[0] ? (
                      <span className="absolute top-full left-0 mt-1 text-xs font-normal text-[#b34b5d]">
                        {field.state.meta.errors[0] as string}
                      </span>
                    ) : null}
                  </>
                )}
              </form.Field>
            </label>
            {!optionsLoading && eligibleOrders.length === 0 ? (
              <p className="mt-4 mb-0 text-sm text-[#806f7d]">
                No hay pedidos sin venta disponibles. Registra o habilita un
                pedido para poder crear la venta.
              </p>
            ) : null}
          </section>

          <section className="py-8">
            <h2 className="mb-5 flex items-center gap-3 text-2xl font-bold text-[#865c7f]">
              <ListChecks size={23} /> Resumen de la venta
            </h2>
            <form.Subscribe selector={(state) => state.values.orderId}>
              {(orderId) => <OrderPreview orderId={orderId} />}
            </form.Subscribe>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#eee2eb] pt-7">
            <button
              className="cursor-pointer border-0 bg-transparent px-4 py-3 text-base text-[#211b21]"
              onClick={() => navigate("/ventas")}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="cursor-pointer rounded-lg border-0 bg-[#8b5e83] px-5 py-3 text-base font-bold text-white hover:bg-[#70466a] disabled:opacity-50"
              disabled={saving || optionsLoading || eligibleOrders.length === 0}
              type="submit"
            >
              Guardar venta
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}
