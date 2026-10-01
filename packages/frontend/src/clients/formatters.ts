export function formatClientDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
