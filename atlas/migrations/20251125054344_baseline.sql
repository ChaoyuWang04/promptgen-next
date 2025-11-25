-- Create "ErrorLog" table
CREATE TABLE "ErrorLog" (
  "id" text NOT NULL,
  "level" text NOT NULL,
  "message" text NOT NULL,
  "stack" text NULL,
  "context" jsonb NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);
-- Create index "ErrorLog_level_createdAt_idx" to table: "ErrorLog"
CREATE INDEX "ErrorLog_level_createdAt_idx" ON "ErrorLog" ("level", "createdAt");
-- Create enum type "TemplateType"
CREATE TYPE "TemplateType" AS ENUM ('SYSTEM', 'USER');
-- Create enum type "TemplateCategory"
CREATE TYPE "TemplateCategory" AS ENUM ('MAIN', 'DIFF');
-- Create enum type "LibraryCategory"
CREATE TYPE "LibraryCategory" AS ENUM ('MAIN', 'DIFF');
-- Create enum type "BatchStatus"
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
-- Create enum type "PromptType"
CREATE TYPE "PromptType" AS ENUM ('MAIN', 'DIFF');
-- Create "ImageBatch" table
CREATE TABLE "ImageBatch" (
  "id" text NOT NULL,
  "imageIds" jsonb NOT NULL,
  "totalImages" integer NOT NULL,
  "completed" integer NOT NULL DEFAULT 0,
  "failed" integer NOT NULL DEFAULT 0,
  "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "ImageBatch_status_idx" to table: "ImageBatch"
CREATE INDEX "ImageBatch_status_idx" ON "ImageBatch" ("status");
-- Create "Library" table
CREATE TABLE "Library" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "displayName" text NOT NULL,
  "description" text NULL,
  "displayField" text NOT NULL DEFAULT 'name',
  "category" "LibraryCategory" NOT NULL DEFAULT 'MAIN',
  "entries" jsonb NOT NULL,
  "schema" jsonb NULL,
  "schemaVersion" text NOT NULL DEFAULT '1.0',
  "order" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true,
  "metadata" jsonb NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "Library_category_isActive_idx" to table: "Library"
CREATE INDEX "Library_category_isActive_idx" ON "Library" ("category", "isActive");
-- Create index "Library_isActive_order_idx" to table: "Library"
CREATE INDEX "Library_isActive_order_idx" ON "Library" ("isActive", "order");
-- Create index "Library_name_idx" to table: "Library"
CREATE INDEX "Library_name_idx" ON "Library" ("name");
-- Create index "Library_name_key" to table: "Library"
CREATE UNIQUE INDEX "Library_name_key" ON "Library" ("name");
-- Create index "Library_order_key" to table: "Library"
CREATE UNIQUE INDEX "Library_order_key" ON "Library" ("order");
-- Create "Template" table
CREATE TABLE "Template" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NULL,
  "type" "TemplateType" NOT NULL,
  "category" "TemplateCategory" NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "Template_name_key" to table: "Template"
CREATE UNIQUE INDEX "Template_name_key" ON "Template" ("name");
-- Create index "Template_type_category_idx" to table: "Template"
CREATE INDEX "Template_type_category_idx" ON "Template" ("type", "category");
-- Create "Combination" table
CREATE TABLE "Combination" (
  "id" text NOT NULL,
  "combinationKey" text NOT NULL,
  "libraryIds" jsonb NOT NULL,
  "mainTemplateId" text NULL,
  "diffTemplateId" text NULL,
  "strategyConfig" jsonb NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Combination_diffTemplateId_fkey" FOREIGN KEY ("diffTemplateId") REFERENCES "Template" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "Combination_mainTemplateId_fkey" FOREIGN KEY ("mainTemplateId") REFERENCES "Template" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "Combination_combinationKey_idx" to table: "Combination"
CREATE INDEX "Combination_combinationKey_idx" ON "Combination" ("combinationKey");
-- Create index "Combination_combinationKey_key" to table: "Combination"
CREATE UNIQUE INDEX "Combination_combinationKey_key" ON "Combination" ("combinationKey");
-- Create index "Combination_diffTemplateId_idx" to table: "Combination"
CREATE INDEX "Combination_diffTemplateId_idx" ON "Combination" ("diffTemplateId");
-- Create index "Combination_mainTemplateId_idx" to table: "Combination"
CREATE INDEX "Combination_mainTemplateId_idx" ON "Combination" ("mainTemplateId");
-- Create "Record" table
CREATE TABLE "Record" (
  "id" text NOT NULL,
  "imageId" text NOT NULL,
  "combinationId" text NULL,
  "variantNumber" integer NOT NULL DEFAULT 1,
  "libraryIds" jsonb NOT NULL,
  "outfitMinorState" jsonb NOT NULL,
  "usedDecorations" jsonb NOT NULL,
  "providerUsed" text NULL,
  "providerAttempts" jsonb NOT NULL,
  "promptGenerated" boolean NOT NULL DEFAULT false,
  "imageGenerated" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Record_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "Combination" ("id") ON UPDATE CASCADE ON DELETE SET NULL
);
-- Create index "Record_combinationId_idx" to table: "Record"
CREATE INDEX "Record_combinationId_idx" ON "Record" ("combinationId");
-- Create index "Record_imageId_idx" to table: "Record"
CREATE INDEX "Record_imageId_idx" ON "Record" ("imageId");
-- Create index "Record_imageId_key" to table: "Record"
CREATE UNIQUE INDEX "Record_imageId_key" ON "Record" ("imageId");
-- Create index "Record_promptGenerated_imageGenerated_idx" to table: "Record"
CREATE INDEX "Record_promptGenerated_imageGenerated_idx" ON "Record" ("promptGenerated", "imageGenerated");
-- Create "ImageVariant" table
CREATE TABLE "ImageVariant" (
  "id" text NOT NULL,
  "recordId" text NOT NULL,
  "version" integer NOT NULL,
  "imageMainPath" text NULL,
  "imageDiffPath" text NULL,
  "finalImages" jsonb NULL,
  "generatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  CONSTRAINT "ImageVariant_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "ImageVariant_recordId_idx" to table: "ImageVariant"
CREATE INDEX "ImageVariant_recordId_idx" ON "ImageVariant" ("recordId");
-- Create index "ImageVariant_recordId_version_key" to table: "ImageVariant"
CREATE UNIQUE INDEX "ImageVariant_recordId_version_key" ON "ImageVariant" ("recordId", "version");
-- Create "Prompt" table
CREATE TABLE "Prompt" (
  "id" text NOT NULL,
  "recordId" text NOT NULL,
  "type" "PromptType" NOT NULL,
  "promptCn" text NOT NULL,
  "promptEn" text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "Prompt_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record" ("id") ON UPDATE CASCADE ON DELETE CASCADE
);
-- Create index "Prompt_recordId_type_idx" to table: "Prompt"
CREATE INDEX "Prompt_recordId_type_idx" ON "Prompt" ("recordId", "type");
