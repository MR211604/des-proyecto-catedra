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

const paths: Record<IconName, string> = {
  bell: "M6 17h12M7.5 14V9a4.5 4.5 0 0 1 9 0v5l1.5 2h-12l1.5-2ZM10 20h4",
  calendar: "M5 7h14v12H5zM8 4v6M16 4v6M5 11h14",
  cash: "M4 7h16v10H4zM7 10h.01M17 14h.01M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0",
  chart: "M5 19V9M12 19V5M19 19v-7M3 19h18",
  check: "m5 12 4 4L19 6",
  clients:
    "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 3.1a4 4 0 0 1 0 7.8M21 20v-1a4 4 0 0 0-3-3.87",
  clipboard: "M8 4h8v3H8zM6 5H4v15h16V5h-2M8 12h8M8 16h5",
  help: "M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1 .8-1.7 1.2-1.7 2.7M12 17h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  inventory: "M4 7h16v13H4zM4 10h16M8 4h8v3H8zM8 14h4",
  orders: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  plus: "M12 5v14M5 12h14",
  production: "m7 4 13 13M20 4 7 17M4 20h4M4 20v-4M20 4h-4M20 4v4",
  reports: "M5 4h14v16H5zM8 16v-4M12 16V8M16 16v-6",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19 12a7.1 7.1 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.2 7.2 0 0 0-2.1-1.2L14.2 3h-4.4l-.3 2.6a7.2 7.2 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.5A7.1 7.1 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7.2 7.2 0 0 0 2.1 1.2l.3 2.6h4.4l.3-2.6a7.2 7.2 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  scissors:
    "M6 6a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM6 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM8 9l12 8M8 17 20 9",
};

export function Icon({ name, size = 24 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="block shrink-0"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
