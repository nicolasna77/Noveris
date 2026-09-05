-- CreateEnum
CREATE TYPE "ServiceEventType" AS ENUM ('CREATED', 'PAYMENT_RECEIVED', 'ACTIVATED', 'NOTE_ADDED', 'PHONE_ASSIGNED', 'CALENDAR_CONNECTED', 'CALENDAR_DISCONNECTED', 'CONFIGURATION_UPDATED', 'CANCELED');

-- CreateTable
CREATE TABLE "service_event" (
    "id" TEXT NOT NULL,
    "clientServiceId" TEXT NOT NULL,
    "type" "ServiceEventType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_event_clientServiceId_createdAt_idx" ON "service_event"("clientServiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "service_event" ADD CONSTRAINT "service_event_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

