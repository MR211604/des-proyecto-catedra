import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  ClientOption,
  InventoryItem,
  Order,
  OrderDetail,
  OrderSort,
  OrderStatus,
  OrdersResponse,
  ProductionStage,
  SortOrder,
} from "./types.ts";

type OrderListParams = {
  page: number;
  limit: number;
  search: string;
  status?: OrderStatus;
  sortBy: OrderSort;
  order: SortOrder;
};

export function useOrders(params: OrderListParams) {
  const { getToken } = useAuth();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    sortBy: params.sortBy,
    order: params.order,
  });
  if (params.status) query.set("status", params.status);

  return useQuery({
    queryKey: ["orders", params],
    queryFn: () =>
      createApiClient(getToken).get<OrdersResponse>(`/api/v1/orders?${query}`),
  });
}

export function useOrderMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["orders"] });

  const start = useMutation({
    mutationFn: (id: string) =>
      client.post<Order>(`/api/v1/orders/${id}/start`, {}),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      client.post<Order>(`/api/v1/orders/${id}/cancel`, {}),
    onSuccess: refresh,
  });

  return { start, cancel };
}

export function useOrder(id: string | undefined) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: ["order", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<OrderDetail>(`/api/v1/orders/${id}`),
  });
}

export function useOrderFormOptions() {
  const { getToken } = useAuth();
  return {
    clients: useQuery({
      queryKey: ["order-form-clients"],
      queryFn: async () => {
        const response = await createApiClient(getToken).get<{
          data: ClientOption[];
        }>("/api/v1/clients?limit=100&sortBy=name&order=asc");
        return response.data;
      },
    }),
    inventory: useQuery({
      queryKey: ["order-form-inventory"],
      queryFn: async () => {
        const response = await createApiClient(getToken).get<{
          data: InventoryItem[];
        }>("/api/v1/inventory/items?limit=100&sortBy=name&order=asc");
        return response.data;
      },
    }),
    stages: useQuery({
      queryKey: ["order-form-stages"],
      queryFn: () =>
        createApiClient(getToken).get<ProductionStage[]>(
          "/api/v1/production/stages",
        ),
    }),
  };
}

export function useOrderFormMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    await queryClient.invalidateQueries({ queryKey: ["order"] });
  };
  const create = useMutation({
    mutationFn: (input: unknown) =>
      client.post<OrderDetail>("/api/v1/orders", input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: unknown }) =>
      client.put<OrderDetail>(`/api/v1/orders/${id}`, input),
    onSuccess: refresh,
  });
  return { create, update };
}
