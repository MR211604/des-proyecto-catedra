export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  measurements: ClientMeasurement | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type MeasurementValues = Partial<{
  chest: number;
  waist: number;
  hips: number;
  sleeveLength: number;
  garmentLength: number;
  shoulders: number;
}>;

export type ClientMeasurement = {
  id: string;
  clientId: string;
  unit: "cm" | "m";
  values: MeasurementValues;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  measurements?: {
    unit: "cm";
    values: MeasurementValues;
    notes?: string;
  };
};

export type OrderSummary = {
  id: string;
  number: number;
  status: "CONFIRMED" | "IN_PRODUCTION" | "READY" | "DELIVERED" | "CANCELLED";
  items: Array<{ total: string }>;
  createdAt: string;
};

export type OrdersResponse = {
  data: OrderSummary[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
