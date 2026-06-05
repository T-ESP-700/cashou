-- CreateTable
CREATE TABLE "asset_unlocks" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "level_event_id" INTEGER,
    "unlock_percent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_unlocks_level_id_asset_id_key" ON "asset_unlocks"("level_id", "asset_id");

-- AddForeignKey
ALTER TABLE "asset_unlocks" ADD CONSTRAINT "asset_unlocks_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_unlocks" ADD CONSTRAINT "asset_unlocks_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_unlocks" ADD CONSTRAINT "asset_unlocks_level_event_id_fkey" FOREIGN KEY ("level_event_id") REFERENCES "level_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
