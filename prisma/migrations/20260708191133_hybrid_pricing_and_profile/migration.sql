-- AlterEnum
ALTER TYPE "ClientServiceStatus" ADD VALUE 'CONFIGURING';

-- AlterTable
ALTER TABLE "client_service" ADD COLUMN     "adminNote" TEXT;

-- AlterTable
ALTER TABLE "service" DROP COLUMN "priceCents",
DROP COLUMN "recurring",
ADD COLUMN     "monthlyPriceCents" INTEGER,
ADD COLUMN     "setupFeeCents" INTEGER,
ADD COLUMN     "usageCapLabel" TEXT;

-- CreateTable
CREATE TABLE "client_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT,
    "logoUrl" TEXT,
    "siret" TEXT,
    "vatRegime" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "metaBusinessHandle" TEXT,
    "calendarUrl" TEXT,
    "productCatalog" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_profile_userId_key" ON "client_profile"("userId");

-- AddForeignKey
ALTER TABLE "client_profile" ADD CONSTRAINT "client_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
