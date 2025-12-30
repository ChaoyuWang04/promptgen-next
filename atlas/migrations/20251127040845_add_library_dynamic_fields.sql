-- Modify "Library" table
ALTER TABLE "Library" ADD COLUMN "abbreviation" text NULL, ADD COLUMN "isRequired" boolean NOT NULL DEFAULT true;
