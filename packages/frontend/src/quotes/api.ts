import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type { InventoryItem } from "../inventory/types.ts";
import type { Client } from "../clients/types.ts";
import type {
  QuoteDetail,
  QuoteInput,
  QuoteSort,
  QuoteStatus,
  QuotesResponse,
  SortOrder,
} from "./types.ts";

type QuoteListParams = {
  page: number;
  limit: number;
  search: string;
  status?: QuoteStatus;
  sortBy: QuoteSort;
  order: SortOrder;
};

export function useQuotes(params: QuoteListParams) {
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
    queryKey: ["quotes", params],
    queryFn: () =>
      createApiClient(getToken).get<QuotesResponse>(
        `/api/v1/quotes?${query.toString()}`,
      ),
  });
}

export function useQuote(id: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["quote", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<QuoteDetail>(`/api/v1/quotes/${id}`),
  });
}

export function useQuoteFormOptions() {
  const { getToken } = useAuth();
  const client = createApiClient(getToken);

  return {
    clients: useQuery({
      queryKey: ["quote-form-clients"],
      queryFn: async () => {
        const response = await client.get<{ data: Client[] }>(
          "/api/v1/clients?limit=100&sortBy=name&order=asc&includeDeleted=false",
        );
        return response.data;
      },
    }),
    inventory: useQuery({
      queryKey: ["quote-form-inventory"],
      queryFn: async () => {
        const response = await client.get<{ data: InventoryItem[] }>(
          "/api/v1/inventory/items?limit=100&status=active&sortBy=name&order=asc",
        );
        return response.data;
      },
    }),
  };
}

export function useQuoteFormMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const refresh = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["quotes"] });
    if (id) await queryClient.invalidateQueries({ queryKey: ["quote", id] });
  };

  const create = useMutation({
    mutationFn: (input: QuoteInput) =>
      client.post<QuoteDetail>("/api/v1/quotes", input),
    onSuccess: () => refresh(),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuoteInput }) =>
      client.put<QuoteDetail>(`/api/v1/quotes/${id}`, input),
    onSuccess: (_data, variables) => refresh(variables.id),
  });

  return { create, update };
}
