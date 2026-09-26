import { NavLink } from "react-router-dom";
import { SignInIcon } from "../auth/AuthIcons";
import { Icon, type IconName } from "./Icon";

const navigation: { label: string; icon: IconName; to: string }[] = [
  { label: "Dashboard", icon: "chart", to: "/dashboard" },
  { label: "Clientes", icon: "clients", to: "/clientes" },
  { label: "Cotizaciones", icon: "receipt", to: "/cotizaciones" },
  { label: "Pedidos", icon: "orders", to: "/pedidos" },
  { label: "Producción", icon: "production", to: "/produccion" },
  { label: "Inventario", icon: "inventory", to: "/inventario" },
  { label: "Proveedores", icon: "truck", to: "/proveedores" },
  { label: "Ventas", icon: "cash", to: "/ventas" },
  { label: "Reportes", icon: "reports", to: "/reportes" },
  { label: "Configuración", icon: "settings", to: "/configuracion" },
];

export function Sidebar() {
  return (
    <aside className="flex min-h-screen w-65 flex-[0_0_260px] flex-col bg-[#e4dbe4] px-2.5 py-7.5 max-[1100px]:w-55 max-[1100px]:basis-55 max-[820px]:relative max-[820px]:min-h-0 max-[820px]:w-full max-[820px]:basis-auto max-[820px]:px-4 max-[820px]:py-4.5">
      <div className="flex items-center gap-3 px-3.75 text-[#70466a] max-[820px]:px-0">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#bd9fb8] bg-[#f8edf7]">
          <SignInIcon />
        </div>
        <div className="min-w-0">
          <strong className="block text-lg leading-tight">
            Confecciones Azucena
          </strong>
          <span className="mt-1.25 block text-sm text-[#302630]">
            Studio Atelier
          </span>
        </div>
      </div>
      <nav
        aria-label="Navegación principal"
        className="mt-8.75 grid gap-1.5 max-[820px]:mt-4.5 max-[820px]:flex max-[820px]:gap-1 max-[820px]:overflow-x-auto"
      >
        {navigation.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `relative flex min-h-13.5 items-center gap-4 border-0 bg-transparent px-3.75 text-left text-[#332c34] hover:bg-[#fff7fc66] max-[820px]:min-h-10.5 max-[820px]:shrink-0 max-[820px]:gap-2 max-[820px]:px-3 max-[820px]:whitespace-nowrap ${isActive ? "font-bold text-[#70466a] before:absolute before:bottom-0 before:left-0 before:top-0 before:w-1 before:rounded-r before:bg-[#8b5e83] max-[820px]:before:bottom-0 max-[820px]:before:left-0 max-[820px]:before:right-0 max-[820px]:before:top-auto max-[820px]:before:h-0.75 max-[820px]:before:w-auto" : ""}`
            }
            key={item.label}
            to={item.to}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
