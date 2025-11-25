-- AlterTable
ALTER TABLE "Library" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayField" TEXT NOT NULL DEFAULT 'name',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "schemaVersion" TEXT NOT NULL DEFAULT '1.0';

-- CreateIndex
CREATE INDEX "Library_isActive_order_idx" ON "Library"("isActive", "order");
