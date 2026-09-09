-- CreateEnum
CREATE TYPE "MarketingChannel" AS ENUM ('LINKEDIN', 'FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "MarketingPostStatus" AS ENUM ('DRAFT', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "marketing_post" (
    "id" TEXT NOT NULL,
    "channel" "MarketingChannel" NOT NULL,
    "status" "MarketingPostStatus" NOT NULL DEFAULT 'DRAFT',
    "angle" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "serviceId" TEXT,
    "imageBrief" TEXT,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketing_post_status_createdAt_idx" ON "marketing_post"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "marketing_post" ADD CONSTRAINT "marketing_post_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
