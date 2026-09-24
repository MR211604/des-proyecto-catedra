import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
  SortOrder,
  Supplier,
  SupplierDetail,
  SupplierInput,
  SupplierItemTab,
  SupplierSort,
  SuppliersResponse,
  SupplierTab,
} from "./types.ts";

type SupplierListParams = {
  page: number;
  limit: number;
  search: string;
  tab: SupplierTab;
  sortBy: SupplierSort;
  order: SortOrder;
};

export type SupplierItemsParams = {
  page: number;
  limit: number;
  search: string;
  status: SupplierItemTab;
};

export function buildSupplierListQuery(params: SupplierListParams) {
  return new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    search: params.search,
    status: params.tab,
    sortBy: params.sortBy,
    order: params.order,
    includeDeleted: String(params.tab !== "active"),
  });
}

export function useSuppliers(params: SupplierListParams) {
  const { getToken } = useAuth();
  const query = buildSupplierListQuery(params);

  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () =>
      createApiClient(getToken).get<SuppliersResponse>(
        `/api/v1/suppliers?${query}`,
      ),
  });
}

export function useSupplier(
  id: string | undefined,
  params?: SupplierItemsParams,
) {
  const { getToken } = useAuth();
  const query = params
    ? new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
        search: params.search,
        status: params.status,
      })
    : null;

  return useQuery({
    queryKey: ["supplier", id, params],
    enabled: Boolean(id),
    queryFn: () =>
      createApiClient(getToken).get<SupplierDetail>(
        `/api/v1/suppliers/${id}${query ? `?${query}` : ""}`,
      ),
  });
}

export function useSupplierMutations() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const client = createApiClient(getToken);

  const refresh = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    if (id) {
      await queryClient.invalidateQueries({ queryKey: ["supplier", id] });
    }
    await queryClient.invalidateQueries({ queryKey: ["inventory-suppliers"] });
  };

  const create = useMutation({
    mutationFn: (input: SupplierInput) =>
      client.post<Supplier>("/api/v1/suppliers", input),
    onSuccess: () => refresh(),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) =>
      client.put<Supplier>(`/api/v1/suppliers/${id}`, input),
    onSuccess: (_data, variables) => refresh(variables.id),
  });
  const restore = useMutation({
    mutationFn: (id: string) =>
      client.patch<Supplier>(`/api/v1/suppliers/${id}/restore`),
    onSuccess: (_data, id) => refresh(id),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) =>
      client.delete<Supplier>(`/api/v1/suppliers/${id}`),
    onSuccess: (_data, id) => refresh(id),
  });

  return { create, update, restore, deactivate };
}
