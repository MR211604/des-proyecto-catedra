import {
  Banknote,
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  type LucideIcon,
  Package,
  Plus,
  ReceiptText,
  Scissors,
  Settings,
  Truck,
  UsersRound,
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
  | "receipt"
  | "reports"
  | "settings"
  | "truck"
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
  receipt: ReceiptText,
  reports: ChartNoAxesColumn,
  settings: Settings,
  truck: Truck,
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
