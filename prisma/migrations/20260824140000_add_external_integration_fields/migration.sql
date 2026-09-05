-- AlterTable
ALTER TABLE "client_service" ADD COLUMN     "externalAgentId" TEXT,
ADD COLUMN     "externalPhoneNumber" TEXT;

-- AlterTable
ALTER TABLE "usage_event" ADD COLUMN     "durationSec" INTEGER,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "client_service_externalAgentId_key" ON "client_service"("externalAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_event_externalId_key" ON "usage_event"("externalId");
