import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type { OrdersResponse } from "../orders/types.ts";
import type {
  PaymentInput,
  PaymentMutationResponse,
  PaymentsResponse,
  Sale,
  SaleDetail,
  SaleInput,
  SaleSort,
  SaleStatus,
  SalesResponse,
  SortOrder,
  UpdatePaymentInput,
} from "./types.ts";

type SaleListParams = {
  page: number;
  limit: number;
  status?: SaleStatus;
  sortBy: SaleSort;
  order: SortOrder;
};

const paymentHistoryLimit = 10;

export function useSales(params: SaleListParams) {
  const { getToken } = useAuth();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    order: params.order,
  });
  if (params.status) query.set("status", params.status);

  return useQuery({
    queryKey: ["sales", params],
    queryFn: () =>
      createApiClient(getToken).get<SalesResponse>(`/api/v1/sales?${query}`),
  });
}

export function useSale(id: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["sale", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<SaleDetail>(`/api/v1/sales/${id}`),
  });
}

export function useSalePayments(id: string | undefined) {
  const { getToken } = useAuth();
  const query = new URLSearchParams({
    limit: String(paymentHistoryLimit),
    order: "desc",
  });

  return useQuery({
    queryKey: ["sale-payments", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<PaymentsResponse>(
        `/api/v1/sales/${id}/payments?${query}`,
      ),
  });
}

export function useSaleFormOptions() {
  const { getToken } = useAuth();
  const client = createApiClient(getToken);

  return {
    orders: useQuery({
      queryKey: ["sale-form-orders"],
      queryFn: async () => {
        const response = await client.get<OrdersResponse>(
          "/api/v1/orders?limit=100&sortBy=createdAt&order=desc",
        );
        return response.data;
      },
    }),
    sales: useQuery({
      queryKey: ["sale-form-sales"],
      queryFn: async () => {
        const response = await client.get<SalesResponse>(
          "/api/v1/sales?limit=100&sortBy=createdAt&order=desc",
        );
        return response.data;
      },
    }),
  };
}

export function useSaleMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const refresh = async (saleId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales"] }),
      queryClient.invalidateQueries({ queryKey: ["sale", saleId] }),
      queryClient.invalidateQueries({ queryKey: ["sale-payments", saleId] }),
    ]);
  };

  const create = useMutation({
    mutationFn: (input: SaleInput) => client.post<Sale>("/api/v1/sales", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  const voidSale = useMutation({
    mutationFn: (id: string) =>
      client.post<SaleDetail>(`/api/v1/sales/${id}/void`, {}),
    onSuccess: (_data, id) => refresh(id),
  });

  const createPayment = useMutation({
    mutationFn: ({ saleId, input }: { saleId: string; input: PaymentInput }) =>
      client.post<PaymentMutationResponse>(
        `/api/v1/sales/${saleId}/payments`,
        input,
      ),
    onSuccess: (_data, { saleId }) => refresh(saleId),
  });

  const updatePayment = useMutation({
    mutationFn: ({
      saleId,
      paymentId,
      input,
    }: {
      saleId: string;
      paymentId: string;
      input: UpdatePaymentInput;
    }) =>
      client.put<PaymentMutationResponse>(
        `/api/v1/sales/${saleId}/payments/${paymentId}`,
        input,
      ),
    onSuccess: (_data, { saleId }) => refresh(saleId),
  });

  const deletePayment = useMutation({
    mutationFn: ({
      saleId,
      paymentId,
    }: {
      saleId: string;
      paymentId: string;
    }) =>
      client.delete<PaymentMutationResponse>(
        `/api/v1/sales/${saleId}/payments/${paymentId}`,
      ),
    onSuccess: (_data, { saleId }) => refresh(saleId),
  });

  return { create, voidSale, createPayment, updatePayment, deletePayment };
}
