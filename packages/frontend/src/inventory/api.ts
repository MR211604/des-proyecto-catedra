import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  InventoryItem,
  InventoryResponse,
  InventorySort,
  InventorySupplier,
  InventoryTab,
  SortOrder,
  StockMovement,
  StockMovementsResponse,
  SuppliersResponse,
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

export function useInventoryItem(id: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["inventory-item", id],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<InventoryItem>(
        `/api/v1/inventory/items/${id}`,
      ),
  });
}

export function useInventorySuppliers() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["inventory-suppliers"],
    queryFn: () =>
      createApiClient(getToken).get<SuppliersResponse>(
        "/api/v1/suppliers?limit=100&sortBy=name&order=asc&includeDeleted=false",
      ),
    select: (response): InventorySupplier[] => response.data,
  });
}

export function useInventoryMovements(
  itemId: string | undefined,
  params: {
    page: number;
    limit: number;
    type?: StockMovement["type"];
    order: SortOrder;
  },
) {
  const { getToken } = useAuth();
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    order: params.order,
    ...(params.type ? { type: params.type } : {}),
  });

  return useQuery({
    queryKey: ["inventory-movements", itemId, params],
    enabled: Boolean(itemId),
    queryFn: () =>
      createApiClient(getToken).get<StockMovementsResponse>(
        `/api/v1/inventory/items/${itemId}/movements?${query}`,
      ),
  });
}

export function useInventoryMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const invalidateInventoryQueries = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    if (id) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory-item", id] }),
        queryClient.invalidateQueries({
          queryKey: ["inventory-movements", id],
        }),
      ]);
    }
  };

  const create = useMutation({
    mutationFn: (input: {
      name: string;
      sku?: string;
      unit: InventoryItem["unit"];
      quantity: string;
      reorderPoint: string;
      supplierId?: string;
    }) => client.post<InventoryItem>("/api/v1/inventory/items", input),
    onSuccess: () => invalidateInventoryQueries(),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        name: string;
        sku?: string | null;
        reorderPoint: string;
        supplierId?: string | null;
      };
    }) => client.put<InventoryItem>(`/api/v1/inventory/items/${id}`, input),
    onSuccess: (_data, variables) => invalidateInventoryQueries(variables.id),
  });

  const movement = useMutation({
    mutationFn: ({
      itemId,
      input,
    }: {
      itemId: string;
      input: {
        type: StockMovement["type"];
        quantity: string;
        unit: InventoryItem["unit"];
        reference?: string;
        reason?: string;
      };
    }) =>
      client.post<StockMovement>(
        `/api/v1/inventory/items/${itemId}/movements`,
        input,
      ),
    onSuccess: (_data, variables) =>
      invalidateInventoryQueries(variables.itemId),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) =>
      client.delete<InventoryItem>(`/api/v1/inventory/items/${id}`),
    onSuccess: (_data, id) => invalidateInventoryQueries(id),
  });

  const restore = useMutation({
    mutationFn: (id: string) =>
      client.patch<InventoryItem>(`/api/v1/inventory/items/${id}/restore`),
    onSuccess: (_data, id) => invalidateInventoryQueries(id),
  });

  return { create, update, movement, deactivate, restore };
}
