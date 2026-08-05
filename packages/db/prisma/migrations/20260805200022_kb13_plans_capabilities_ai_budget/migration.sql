-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "aiBudgetMicroUsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capabilities" TEXT[],
ADD COLUMN     "planId" TEXT;

-- AlterTable
ALTER TABLE "product_access" ADD COLUMN     "aiBudgetMicroUsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "aiUsedMicroUsd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "capabilities" TEXT[],
ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "durationDays" INTEGER NOT NULL,
    "capabilities" TEXT[],
    "aiBudgetMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_productId_slug_key" ON "plans"("productId", "slug");

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
