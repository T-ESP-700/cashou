/*
  Warnings:

  - You are about to drop the column `field` on the `assets` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `event_assets` table. All the data in the column will be lost.
  - You are about to drop the column `volume` on the `event_assets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assets" DROP COLUMN "field",
ADD COLUMN     "field_id" INTEGER;

-- AlterTable
ALTER TABLE "event_assets" DROP COLUMN "value",
DROP COLUMN "volume";

-- AlterTable
ALTER TABLE "impacts" ADD COLUMN     "asset_id" INTEGER;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impacts" ADD CONSTRAINT "impacts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
