-- AlterTable
ALTER TABLE "public"."asset_histories" ADD COLUMN     "value" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."assets" ADD COLUMN     "max_amount" DECIMAL(65,30),
ADD COLUMN     "min_amount" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "public"."holdings" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "game_instance_id" INTEGER NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_interest_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holdings_wallet_id_asset_id_key" ON "public"."holdings"("wallet_id", "asset_id");

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
