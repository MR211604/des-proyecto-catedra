export function formatOrderDate(value: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatOrderTotal(items: Array<{ total: string }>) {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(items.reduce((sum, item) => sum + Number(item.total), 0));
}
