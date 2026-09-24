export type InventoryUnit = "METER" | "UNIT" | "ROLL" | "KILOGRAM";

export type StockMovementType =
  | "RECEIPT"
  | "ISSUE"
  | "SALE"
  | "ADJUSTMENT"
  | "RETURN";

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

export type InventorySupplier = {
  id: string;
  name: string;
  deletedAt: string | null;
};

export type SuppliersResponse = {
  data: InventorySupplier[];
};

export type StockMovement = {
  id: string;
  itemId: string;
  orderItemId: string | null;
  orderItem?: {
    id: string;
    orderId: string;
    description: string;
    quantity: string;
    unitPrice: string;
    total: string;
    specifications: unknown;
  } | null;
  type: StockMovementType;
  quantity: string;
  unit: InventoryUnit;
  reference: string | null;
  reason: string | null;
  actorId: string;
  createdAt: string;
};

export type StockMovementsResponse = {
  data: StockMovement[];
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
