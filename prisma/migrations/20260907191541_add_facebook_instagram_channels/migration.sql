-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceEventType" ADD VALUE 'FACEBOOK_CONNECTED';
ALTER TYPE "ServiceEventType" ADD VALUE 'FACEBOOK_DISCONNECTED';
ALTER TYPE "ServiceEventType" ADD VALUE 'INSTAGRAM_CONNECTED';
ALTER TYPE "ServiceEventType" ADD VALUE 'INSTAGRAM_DISCONNECTED';

-- AlterTable
ALTER TABLE "client_service" ADD COLUMN     "facebookPageAccessToken" TEXT,
ADD COLUMN     "facebookPageId" TEXT,
ADD COLUMN     "facebookPageName" TEXT,
ADD COLUMN     "instagramAccessToken" TEXT,
ADD COLUMN     "instagramAccountId" TEXT,
ADD COLUMN     "instagramTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "instagramUsername" TEXT;
