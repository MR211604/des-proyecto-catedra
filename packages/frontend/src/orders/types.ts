export type OrderStatus =
  | "CONFIRMED"
  | "IN_PRODUCTION"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type Order = {
  id: string;
  number: number;
  client: { name: string };
  quote: { number: number } | null;
  status: OrderStatus;
  notes: string | null;
  dueDate: string | null;
  createdAt: string;
  items: Array<{ total: string }>;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: "METER" | "UNIT" | "ROLL" | "KILOGRAM";
  quantity: string;
};

export type OrderDetail = Omit<Order, "client" | "items"> & {
  client: { id: string; name: string };
  notes: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    materials: Array<{
      inventoryItemId: string;
      quantity: string;
      inventoryItem: InventoryItem;
    }>;
  }>;
  jobs: Array<{
    id: string;
    stageId: string;
    stage: { id: string; name: string };
    description: string;
    orderItemId: string | null;
    assignedTo: string | null;
    dueDate: string | null;
  }>;
};

export type ClientOption = { id: string; name: string };
export type ProductionStage = { id: string; name: string; position: number };

export type OrdersResponse = {
  data: Order[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type OrderSort = "number" | "createdAt" | "dueDate";
export type SortOrder = "asc" | "desc";
