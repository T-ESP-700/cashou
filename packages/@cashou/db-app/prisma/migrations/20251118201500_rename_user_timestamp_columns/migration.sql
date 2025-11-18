-- Rename timestamp columns to camelCase for Better-Auth compatibility
ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt";
