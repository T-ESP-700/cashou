/*
  Warnings:

  - You are about to drop the column `name` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `variation` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `action_required` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `is_paused` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `paused_at` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `start_balance` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `game_instances` table. All the data in the column will be lost.
  - You are about to drop the column `executed_at` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_unit` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `total_amount` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assets" DROP COLUMN "name",
DROP COLUMN "price",
DROP COLUMN "variation",
DROP COLUMN "volume",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "field" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "game_instances" DROP COLUMN "action_required",
DROP COLUMN "is_paused",
DROP COLUMN "paused_at",
DROP COLUMN "start_balance",
DROP COLUMN "type",
ADD COLUMN     "market_id" INTEGER,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "submarkets" ADD COLUMN     "game_instance_id" INTEGER;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "executed_at",
DROP COLUMN "price_per_unit",
DROP COLUMN "total_amount",
ADD COLUMN     "source" TEXT,
ADD COLUMN     "total_value" DECIMAL(65,30),
ADD COLUMN     "transaction_date" TIMESTAMP(3),
ADD COLUMN     "unit_price" DECIMAL(65,30);

-- AddForeignKey
ALTER TABLE "submarkets" ADD CONSTRAINT "submarkets_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_instances" ADD CONSTRAINT "game_instances_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
