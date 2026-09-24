type Order = {
  id: string;
  client: string;
  service: string;
  status: string;
  statusClass: "in-progress" | "completed" | "pending" | "delayed";
  delivery: string;
};

const orders: Order[] = [
  {
    id: "#ORD-092",
    client: "María González",
    service: "Sastrería",
    status: "En Proceso",
    statusClass: "in-progress",
    delivery: "Oct 24",
  },
  {
    id: "#ORD-091",
    client: "Carlos Ruiz",
    service: "Arreglo",
    status: "Completado",
    statusClass: "completed",
    delivery: "Oct 23",
  },
  {
    id: "#ORD-090",
    client: "Ana Silva",
    service: "Confección",
    status: "Pendiente",
    statusClass: "pending",
    delivery: "Oct 28",
  },
  {
    id: "#ORD-089",
    client: "Elena Torres",
    service: "Sastrería",
    status: "En Proceso",
    statusClass: "in-progress",
    delivery: "Oct 25",
  },
  {
    id: "#ORD-088",
    client: "Luis Medina",
    service: "Arreglo",
    status: "Retrasado",
    statusClass: "delayed",
    delivery: "Oct 22",
  },
];

const statusStyles = {
  "in-progress": "bg-[#f3e6f1] text-[#8b5e83]",
  completed: "bg-[#f5e7ea] text-[#7b535c]",
  pending: "bg-[#ede8ed] text-[#514952]",
  delayed: "bg-[#ffdadf] text-[#ba1a1a]",
} as const;

export function RecentOrders() {
  return (
    <section className="overflow-hidden rounded-[9px] border border-[#e8dce6] bg-[#fff7fc] shadow-[0_5px_16px_rgb(75_49_69/6%)]">
      <div className="flex min-h-24 items-center justify-between border-b border-[#e8dce6] px-7.5 max-[480px]:px-5">
        <h2 className="m-0 text-[25px] tracking-[-0.5px] max-[480px]:text-[21px]">
          Pedidos Recientes
        </h2>
        <button
          className="cursor-pointer border-0 bg-transparent font-bold text-[#8b5e83]"
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
              <th className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                Order ID
              </th>
              <th className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                Cliente
              </th>
              <th className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                Servicio
              </th>
              <th className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                Estado
              </th>
              <th className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                Entrega
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-b border-[#e8dce6]" key={order.id}>
                <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                  {order.id}
                </td>
                <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                  {order.client}
                </td>
                <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                  {order.service}
                </td>
                <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                  <span
                    className={`rounded-full px-2.75 py-1.5 text-sm font-semibold ${statusStyles[order.statusClass]}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="whitespace-nowrap border-b border-[#e8dce6] px-5 py-3.75">
                  {order.delivery}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
