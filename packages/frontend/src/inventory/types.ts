export type InventoryUnit = "METER" | "UNIT" | "ROLL" | "KILOGRAM";

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: InventoryUnit;
  quantity: string;
  reorderPoint: string;
  supplierId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type InventoryResponse = {
  data: InventoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InventoryTab = "active" | "inactive" | "all";
export type InventorySort = "name" | "sku" | "quantity";
export type SortOrder = "asc" | "desc";
