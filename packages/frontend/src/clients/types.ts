export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type ClientsResponse = {
  data: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ClientTab = "active" | "inactive" | "all";
export type ClientSort = "name" | "createdAt";
export type SortOrder = "asc" | "desc";
