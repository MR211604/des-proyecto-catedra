import { Icon, type IconName } from "./Icon";

const navigation: { label: string; icon: IconName; active?: boolean }[] = [
  { label: "Dashboard", icon: "chart", active: true },
  { label: "Clientes", icon: "clients" },
  { label: "Pedidos", icon: "orders" },
  { label: "Producción", icon: "production" },
  { label: "Inventario", icon: "inventory" },
  { label: "Ventas", icon: "cash" },
  { label: "Reportes", icon: "reports" },
  { label: "Configuración", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-[260px] flex-[0_0_260px] flex-col bg-[#e4dbe4] px-2.5 py-[30px] max-[1100px]:w-[220px] max-[1100px]:basis-[220px] max-[820px]:relative max-[820px]:min-h-0 max-[820px]:w-full max-[820px]:basis-auto max-[820px]:px-4 max-[820px]:py-[18px]">
      <div className="flex items-center gap-3 px-[15px] text-[#70466a] max-[820px]:px-0">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] border border-[#bd9fb8] bg-[#f8edf7] font-bold tracking-[-2px]">
          CA
        </div>
        <div>
          <strong className="block max-w-[178px] overflow-hidden text-ellipsis whitespace-nowrap text-lg">
            Confecciones Azucena
          </strong>
          <span className="mt-[5px] block text-sm text-[#302630]">
            Studio Atelier
          </span>
        </div>
      </div>
      <nav
        aria-label="Navegación principal"
        className="mt-[35px] grid gap-1.5 max-[820px]:mt-[18px] max-[820px]:flex max-[820px]:gap-1 max-[820px]:overflow-x-auto"
      >
        {navigation.map((item) => (
          <button
            className={`relative flex min-h-[54px] cursor-pointer items-center gap-4 border-0 bg-transparent px-[15px] text-left text-[#332c34] hover:bg-[#fff7fc66] max-[820px]:min-h-[42px] max-[820px]:shrink-0 max-[820px]:gap-2 max-[820px]:px-3 max-[820px]:whitespace-nowrap ${item.active ? "font-bold text-[#70466a] before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:rounded-r bg-transparent before:bg-[#8b5e83] max-[820px]:before:bottom-0 max-[820px]:before:left-0 max-[820px]:before:right-0 max-[820px]:before:top-auto max-[820px]:before:h-[3px] max-[820px]:before:w-auto" : ""}`}
            key={item.label}
            type="button"
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button
        className="mt-auto flex min-h-[50px] cursor-pointer items-center justify-center gap-3.5 rounded-[2px] border-0 bg-[#8b5e83] font-bold text-white max-[820px]:absolute max-[820px]:right-4 max-[820px]:top-[18px] max-[820px]:mt-0 max-[820px]:min-h-10 max-[820px]:px-[13px]"
        type="button"
      >
        <Icon name="plus" size={22} />
        <span className="max-[820px]:hidden">Nuevo Pedido</span>
      </button>
    </aside>
  );
}
