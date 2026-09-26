export type SaleStatus = "OPEN" | "PAID" | "VOIDED";
export type PaymentMethod = "CASH" | "TRANSFER";
export type SaleSort = "number" | "createdAt";
export type SortOrder = "asc" | "desc";

export type Payment = {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: string;
  paidAt: string;
  reference: string | null;
  actorId: string;
};

export type SaleItem = {
  id: string;
  saleId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
};

export type Sale = {
  id: string;
  number: number;
  orderId: string;
  status: SaleStatus;
  total: string;
  paidAmount: string;
  outstandingBalance: string;
  payments: Payment[];
  order: {
    id: string;
    client: { id: string; name: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type SaleDetail = Omit<Sale, "payments"> & {
  subtotal: string;
  items: SaleItem[];
  payments: Payment[];
};

export type SalesResponse = {
  data: Sale[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type PaymentsResponse = {
  data: Payment[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type PaymentMutationResponse = {
  payment: Payment;
  sale: SaleDetail;
};

export type SaleInput = {
  orderId: string;
};

export type PaymentInput = {
  amount: string;
  method: PaymentMethod;
  reference?: string | null;
};

export type UpdatePaymentInput = {
  amount?: string;
  method?: PaymentMethod;
  reference?: string | null;
};
