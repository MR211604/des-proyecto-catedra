export function formatQuoteDate(value: string | null) {
  if (!value) return "-";

  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function formatQuoteTotal(value: string) {
  return new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value));
}
