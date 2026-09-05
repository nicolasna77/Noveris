-- AlterTable
ALTER TABLE "usage_event" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed';

-- CreateIndex
CREATE INDEX "usage_event_clientServiceId_status_idx" ON "usage_event"("clientServiceId", "status");
