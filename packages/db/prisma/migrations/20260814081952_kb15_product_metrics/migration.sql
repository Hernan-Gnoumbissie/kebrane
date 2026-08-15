-- CreateTable
CREATE TABLE "product_metrics" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "unit" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_metrics_capturedAt_idx" ON "product_metrics"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_metrics_productId_key_key" ON "product_metrics"("productId", "key");

-- AddForeignKey
ALTER TABLE "product_metrics" ADD CONSTRAINT "product_metrics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
