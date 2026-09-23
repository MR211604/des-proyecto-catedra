import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  InventoryResponse,
  InventorySort,
  InventoryTab,
  SortOrder,
} from "./types.ts";

type InventoryListParams = {
  page: number;
  limit: number;
  search: string;
  status: InventoryTab;
  sortBy: InventorySort;
  order: SortOrder;
};

export function useInventoryItems(params: InventoryListParams) {
  const { getToken } = useAuth();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    status: params.status,
    sortBy: params.sortBy,
    order: params.order,
  });

  return useQuery({
    queryKey: ["inventory-items", params],
    queryFn: () =>
      createApiClient(getToken).get<InventoryResponse>(
        `/api/v1/inventory/items?${query}`,
      ),
  });
}
