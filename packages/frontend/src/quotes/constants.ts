import type { QuoteStatus } from "./types.ts";

export const quoteTabs: {
  label: string;
  value: QuoteStatus | undefined;
}[] = [
  { label: "Todos", value: undefined },
  { label: "Borradores", value: "DRAFT" },
  { label: "Enviadas", value: "SENT" },
  { label: "Aceptadas", value: "ACCEPTED" },
  { label: "Rechazadas", value: "REJECTED" },
  { label: "Vencidas", value: "EXPIRED" },
];

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  EXPIRED: "Vencida",
};

export const quoteStatusClasses: Record<QuoteStatus, string> = {
  DRAFT: "bg-[#f2e6f1] text-[#805276]",
  SENT: "bg-[#fff0d9] text-[#9a641b]",
  ACCEPTED: "bg-[#e7f4ec] text-[#3c7655]",
  REJECTED: "bg-[#eee8ed] text-[#625660]",
  EXPIRED: "bg-[#fbe9e9] text-[#a33b3b]",
};
