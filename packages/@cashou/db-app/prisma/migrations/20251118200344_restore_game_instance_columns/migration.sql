/*
  Warnings:

  - You are about to drop the column `market_id` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `game_instances` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "game_instances" DROP CONSTRAINT "game_instances_market_id_fkey";

-- AlterTable
ALTER TABLE "game_instances" DROP COLUMN "market_id",
DROP COLUMN "title",
ADD COLUMN     "action_required" BOOLEAN,
ADD COLUMN     "is_paused" BOOLEAN,
ADD COLUMN     "marketId" INTEGER,
ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "start_balance" INTEGER,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "position" INTEGER;

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "game_instances" ADD CONSTRAINT "game_instances_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
