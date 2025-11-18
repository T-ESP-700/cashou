-- AlterTable
ALTER TABLE "user" ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "level_id" SET DEFAULT 0;
