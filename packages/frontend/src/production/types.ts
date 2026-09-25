export type ProductionJobStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED";

export type ProductionJob = {
  id: string;
  orderId: string;
  orderItemId: string | null;
  stageId: string;
  description: string;
  status: ProductionJobStatus;
  assignedTo: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  stage: {
    id: string;
    name: string;
    position: number;
    isActive: boolean;
  };
  orderItem: {
    id: string;
    orderId: string;
    description: string;
    quantity: string;
    unitPrice: string;
    total: string;
    specifications: unknown;
    createdAt: string;
  } | null;
  order: {
    id: string;
    number: number;
    status: string;
    dueDate: string | null;
    client: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
    };
  };
};

export type ProductionEvent = {
  id: string;
  jobId: string;
  type: "STAGE_MOVED" | "BLOCKED" | "UNBLOCKED";
  fromStageId: string | null;
  toStageId: string;
  actorId: string;
  notes: string | null;
  createdAt: string;
  fromStage: { id: string; name: string; position: number } | null;
  toStage: { id: string; name: string; position: number };
};

export type ProductionStage = {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  isHistorical: boolean;
  jobs: ProductionJob[];
};
