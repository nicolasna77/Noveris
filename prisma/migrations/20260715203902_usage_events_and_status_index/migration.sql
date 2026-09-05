-- CreateTable
CREATE TABLE "usage_event" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'call',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_event_clientServiceId_occurredAt_idx" ON "usage_event"("clientServiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "client_service_status_idx" ON "client_service"("status");

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
