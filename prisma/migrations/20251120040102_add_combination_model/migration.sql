-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "combinationId" TEXT,
ADD COLUMN     "variantNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Combination" (
    "id" TEXT NOT NULL,
    "combinationKey" TEXT NOT NULL,
    "libraryIds" JSONB NOT NULL,
    "templateId" TEXT,
    "strategyConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Combination_combinationKey_key" ON "Combination"("combinationKey");

-- CreateIndex
CREATE INDEX "Combination_combinationKey_idx" ON "Combination"("combinationKey");

-- CreateIndex
CREATE INDEX "Combination_templateId_idx" ON "Combination"("templateId");

-- CreateIndex
CREATE INDEX "Record_combinationId_idx" ON "Record"("combinationId");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "Combination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
