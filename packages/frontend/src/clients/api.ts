import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  ClientTab,
  ClientsResponse,
  ClientSort,
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
