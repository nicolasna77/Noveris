-- CreateEnum
CREATE TYPE "HelpRequestStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "help_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientServiceId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "HelpRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "help_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "help_request_status_createdAt_idx" ON "help_request"("status", "createdAt");

-- CreateIndex
CREATE INDEX "help_request_userId_idx" ON "help_request"("userId");

-- CreateIndex
CREATE INDEX "help_request_organizationId_idx" ON "help_request"("organizationId");

-- AddForeignKey
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_request" ADD CONSTRAINT "help_request_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "client_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
