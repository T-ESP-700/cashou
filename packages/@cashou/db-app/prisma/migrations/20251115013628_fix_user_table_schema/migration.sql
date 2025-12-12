-- AlterTable: Rename columns from camelCase to snake_case
ALTER TABLE "user" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user" RENAME COLUMN "updatedAt" TO "updated_at";

-- AlterTable: Drop old better-auth columns
ALTER TABLE "user" DROP COLUMN IF EXISTS "name";
ALTER TABLE "user" DROP COLUMN IF EXISTS "image";

-- AlterTable: Add new columns
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "discriminator" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_activity" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "badges" TEXT;

-- AlterTable: Make level_id required (already updated with default value)
ALTER TABLE "user" ALTER COLUMN "level_id" SET NOT NULL;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_level_id_fkey'
    ) THEN
        ALTER TABLE "user" ADD CONSTRAINT "user_level_id_fkey"
        FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
