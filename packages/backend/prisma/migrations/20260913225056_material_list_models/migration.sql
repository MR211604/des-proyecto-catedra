-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "orderItemId" TEXT;

-- CreateTable
CREATE TABLE "QuoteItemMaterial" (
    "id" TEXT NOT NULL,
    "quoteItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "QuoteItemMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemMaterial" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "OrderItemMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteItemMaterial_quoteItemId_inventoryItemId_key" ON "QuoteItemMaterial"("quoteItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemMaterial_orderItemId_inventoryItemId_key" ON "OrderItemMaterial"("orderItemId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "StockMovement_orderItemId_idx" ON "StockMovement"("orderItemId");

-- AddForeignKey
ALTER TABLE "QuoteItemMaterial" ADD CONSTRAINT "QuoteItemMaterial_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItemMaterial" ADD CONSTRAINT "QuoteItemMaterial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemMaterial" ADD CONSTRAINT "OrderItemMaterial_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemMaterial" ADD CONSTRAINT "OrderItemMaterial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
