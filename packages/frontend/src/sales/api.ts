import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type { OrdersResponse } from "../orders/types.ts";
import type {
  Sale,
  SaleInput,
  SaleSort,
  SaleStatus,
  SalesResponse,
  SortOrder,
} from "./types.ts";

type SaleListParams = {
  page: number;
  limit: number;
  status?: SaleStatus;
  sortBy: SaleSort;
  order: SortOrder;
};

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

  const create = useMutation({
    mutationFn: (input: SaleInput) => client.post<Sale>("/api/v1/sales", input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });

  return { create };
}
