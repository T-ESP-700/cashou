-- CreateEnum
CREATE TYPE "TipCategory" AS ENUM ('FirstStar', 'SecondStar');

-- AlterEnum
ALTER TYPE "ImpactType" ADD VALUE 'CashGrant';

-- DropIndex
DROP INDEX "public"."level_assets_asset_id_idx";

-- DropIndex
DROP INDEX "public"."level_assets_level_id_idx";

-- AlterTable
ALTER TABLE "impacts" ADD COLUMN     "amount" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "level_starting_holdings" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_starting_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tips" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "category" "TipCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_starting_holdings_level_id_asset_id_key" ON "level_starting_holdings"("level_id", "asset_id");

-- AddForeignKey
ALTER TABLE "level_starting_holdings" ADD CONSTRAINT "level_starting_holdings_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_starting_holdings" ADD CONSTRAINT "level_starting_holdings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tips" ADD CONSTRAINT "tips_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
