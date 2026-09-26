export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

export type Quote = {
  id: string;
  number: number;
  client: { name: string };
  status: QuoteStatus;
  notes: string | null;
  total: string;
  validUntil: string | null;
  createdAt: string;
};

export type QuotesResponse = {
  data: Quote[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type QuoteSort = "number" | "createdAt";
export type SortOrder = "asc" | "desc";
