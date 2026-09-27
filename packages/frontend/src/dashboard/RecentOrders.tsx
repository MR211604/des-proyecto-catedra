import { useNavigate } from "react-router-dom";
import { useOrders } from "../orders/api.ts";
import { statusClasses, statusLabels } from "../orders/constants.ts";
import { formatOrderDate } from "../orders/formatters.ts";

const columns = [
  "Order ID",
  "Cliente",
  "Estado",
  "Entregado en",
  "Entrega estimada",
];

export function RecentOrders() {
  const navigate = useNavigate();
  const query = useOrders({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "updatedAt",
    order: "desc",
  });
  const orders = query.data?.data ?? [];

  return (
    <section className="overflow-hidden rounded-[9px] border border-[#e8dce6] bg-[#fff7fc] shadow-[0_5px_16px_rgb(75_49_69/6%)]">
      <div className="flex min-h-24 items-center justify-between border-b border-[#e8dce6] px-7.5 max-[480px]:px-5">
        <h2 className="m-0 text-[25px] tracking-[-0.5px] max-[480px]:text-[21px]">
          Pedidos Recientes
        </h2>
        <button
          className="cursor-pointer border-0 bg-transparent font-bold text-[#8b5e83]"
          onClick={() => navigate("/pedidos")}
          type="button"
        >
          Ver todos{" "}
          <span aria-hidden="true" className="ml-1.25 text-[23px]">
            →
          </span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-170 border-collapse text-left text-base">
          <thead className="bg-[#fffdfd] font-semibold">
            <tr>
              {columns.map((column) => (
                <th
                  className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75"
                  key={column}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.isPending ? (
              <tr>
                <td
                  className="border-b border-[#e8dce6] px-5 py-6 text-center text-[#806f7d]"
                  colSpan={columns.length}
                >
                  Cargando pedidos...
                </td>
              </tr>
            ) : query.isError ? (
              <tr>
                <td
                  className="border-b border-[#e8dce6] px-5 py-6 text-center text-[#806f7d]"
                  colSpan={columns.length}
                >
                  No se pudieron cargar los pedidos.
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  className="border-b border-[#e8dce6] px-5 py-6 text-center text-[#806f7d]"
                  colSpan={columns.length}
                >
                  Aún no hay pedidos registrados.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr className="border-b border-[#e8dce6]" key={order.id}>
                  <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                    ORD-{order.number}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                    {order.client.name}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                    <span
                      className={`rounded-full px-2.75 py-1.5 text-sm font-semibold ${statusClasses[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                    {formatOrderDate(
                      order.deliveredAt ? order.deliveredAt : null,
                    )}
                  </td>
                  <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                    {formatOrderDate(order.dueDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
