import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "../lib/api.ts";
import type {
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
