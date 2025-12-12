-- AlterTable
ALTER TABLE "user" ADD COLUMN     "current_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_streak" INTEGER NOT NULL DEFAULT 0;
