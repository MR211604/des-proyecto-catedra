import type { InventoryUnit } from "../inventory/types.ts";

export type SupplierItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: InventoryUnit;
  quantity: string;
  reorderPoint: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SupplierDetail = Supplier & {
  items: SupplierItem[];
  itemsCount: number;
  itemsMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type SuppliersResponse = {
  data: Supplier[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SupplierTab = "active" | "inactive" | "all";
export type SupplierSort = "name" | "createdAt";
export type SupplierItemTab = "active" | "inactive" | "all";
export type SortOrder = "asc" | "desc";
