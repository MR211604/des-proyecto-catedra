export type ProductionJobStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED";

export type ProductionJob = {
  id: string;
  description: string;
  status: ProductionJobStatus;
  dueDate: string | null;
  orderItem: { id: string; description: string } | null;
  order: {
    id: string;
    number: number;
    dueDate: string | null;
    client: { id: string; name: string };
  };
};

export type ProductionStage = {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  isHistorical: boolean;
  jobs: ProductionJob[];
};
