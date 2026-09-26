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

export type QuoteMaterialUnit = "METER" | "UNIT" | "ROLL" | "KILOGRAM";

export type QuoteMaterial = {
  id: string;
  inventoryItemId: string;
  quantity: string;
  unit?: QuoteMaterialUnit;
  inventoryItem?: {
    id: string;
    name: string;
    sku: string | null;
    unit: QuoteMaterialUnit;
    deletedAt: string | null;
  };
};

export type QuoteItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  specifications: unknown;
  materials: QuoteMaterial[];
};

export type QuoteDetail = Quote & {
  client: { id: string; name: string };
  items: QuoteItem[];
};

export type QuoteInput = {
  clientId: string;
  validUntil?: string;
  notes?: string;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    materials?: Array<{
      inventoryItemId: string;
      quantity: string;
      unit: QuoteMaterialUnit;
    }>;
  }>;
};

export type QuotesResponse = {
  data: Quote[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type QuoteSort = "number" | "createdAt";
export type SortOrder = "asc" | "desc";
