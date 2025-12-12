/*
  Warnings:

  - You are about to drop the column `value` on the `asset_histories` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `asset_histories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "asset_histories" DROP COLUMN "value",
DROP COLUMN "volume";

-- AlterTable
ALTER TABLE "event_assets" ADD COLUMN     "value" INTEGER,
ADD COLUMN     "volume" INTEGER;
