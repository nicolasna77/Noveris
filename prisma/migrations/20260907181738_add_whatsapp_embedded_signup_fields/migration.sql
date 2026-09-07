-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceEventType" ADD VALUE 'WHATSAPP_CONNECTED';
ALTER TYPE "ServiceEventType" ADD VALUE 'WHATSAPP_DISCONNECTED';

-- AlterTable
ALTER TABLE "client_service" ADD COLUMN     "whatsappAccessToken" TEXT,
ADD COLUMN     "whatsappBusinessAccountId" TEXT,
ADD COLUMN     "whatsappDisplayNumber" TEXT;
