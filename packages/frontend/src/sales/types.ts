export type SaleStatus = "OPEN" | "PAID" | "VOIDED";
export type PaymentMethod = "CASH" | "TRANSFER";
export type SaleSort = "number" | "createdAt";
export type SortOrder = "asc" | "desc";

export type Sale = {
  id: string;
  number: number;
  orderId: string;
  status: SaleStatus;
  total: string;
  paidAmount: string;
  outstandingBalance: string;
  payments: Array<{
    id: string;
    method: PaymentMethod;
    amount: string;
  }>;
  order: {
    id: string;
    client: { id: string; name: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type SalesResponse = {
  data: Sale[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type SaleInput = {
  orderId: string;
};
