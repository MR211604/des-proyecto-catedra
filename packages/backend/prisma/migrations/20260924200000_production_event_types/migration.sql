CREATE TYPE "ProductionEventType" AS ENUM ('STAGE_MOVED', 'BLOCKED', 'UNBLOCKED');

ALTER TABLE "ProductionEvent"
ADD COLUMN "type" "ProductionEventType" NOT NULL DEFAULT 'STAGE_MOVED';

ALTER TABLE "ProductionEvent" DROP CONSTRAINT "ProductionEvent_jobId_fkey";

ALTER TABLE "ProductionEvent"
ADD CONSTRAINT "ProductionEvent_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "ProductionJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
