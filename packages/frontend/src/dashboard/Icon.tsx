import {
  Banknote,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Package,
  Plus,
  Scissors,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "bell"
  | "calendar"
  | "cash"
  | "chart"
  | "check"
  | "clients"
  | "clipboard"
  | "help"
  | "inventory"
  | "orders"
  | "plus"
  | "production"
  | "reports"
  | "settings"
  | "scissors";

type IconProps = {
  name: IconName;
  size?: number;
};

const icons: Record<IconName, LucideIcon> = {
  bell: Bell,
  calendar: CalendarDays,
  cash: Banknote,
  chart: ChartNoAxesColumn,
  check: Check,
  clients: UsersRound,
  clipboard: ClipboardCheck,
  help: CircleHelp,
  inventory: Package,
  orders: ClipboardList,
  plus: Plus,
  production: Scissors,
  reports: ChartNoAxesColumn,
  settings: Settings,
  scissors: Scissors,
};

export function Icon({ name, size = 24 }: IconProps) {
  const IconComponent = icons[name];

  return (
    <IconComponent
      aria-hidden="true"
      className="block shrink-0"
      size={size}
      strokeWidth={1.8}
    />
  );
}
