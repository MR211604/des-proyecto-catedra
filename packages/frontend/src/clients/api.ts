import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  Client,
  ClientInput,
  ClientSort,
  ClientsResponse,
  ClientTab,
  OrdersResponse,
  SortOrder,
} from "./types.ts";

type ClientListParams = {
  page: number;
  limit: number;
  search: string;
  tab: ClientTab;
  sortBy: ClientSort;
  order: SortOrder;
};

export function buildClientListQuery(params: ClientListParams) {
  return new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    sortBy: params.sortBy,
    order: params.order,
    includeDeleted: String(params.tab !== "active"),
  });
}

export function useClients(params: ClientListParams) {
  const { getToken } = useAuth();
  const query = buildClientListQuery(params);

  return useQuery({
    queryKey: ["clients", params],
    queryFn: () =>
      createApiClient(getToken).get<ClientsResponse>(
        `/api/v1/clients?${query}`,
      ),
    select: (response) =>
      params.tab === "inactive"
        ? {
            ...response,
            data: response.data.filter((client) => client.deletedAt !== null),
          }
        : response,
  });
}

export function useClient(id: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["client", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<Client>(`/api/v1/clients/${id}`),
  });
}

export function useClientOrders(id: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["client-orders", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<OrdersResponse>(
        `/api/v1/orders?clientId=${encodeURIComponent(id ?? "")}&limit=100&sortBy=createdAt&order=desc`,
      ),
  });
}

export function useClientMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const refresh = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["clients"] });
    if (id) {
      await queryClient.invalidateQueries({ queryKey: ["client", id] });
    }
  };

  const create = useMutation({
    mutationFn: (input: ClientInput) =>
      client.post<Client>("/api/v1/clients", input),
    onSuccess: () => refresh(),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) =>
      client.put<Client>(`/api/v1/clients/${id}`, input),
    onSuccess: (_data, variables) => refresh(variables.id),
  });
  const restore = useMutation({
    mutationFn: (id: string) =>
      client.patch<Client>(`/api/v1/clients/${id}/restore`),
    onSuccess: (_data, id) => refresh(id),
  });

  return { create, update, restore };
}
