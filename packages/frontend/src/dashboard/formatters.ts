const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatDashboardMoney(value: string) {
  return currency.format(Number(value));
}
