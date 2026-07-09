CREATE TABLE "public"."level_assets" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "level_assets_level_id_asset_id_key" ON "public"."level_assets"("level_id", "asset_id");
CREATE INDEX "level_assets_level_id_idx" ON "public"."level_assets"("level_id");
CREATE INDEX "level_assets_asset_id_idx" ON "public"."level_assets"("asset_id");

ALTER TABLE "public"."level_assets"
ADD CONSTRAINT "level_assets_level_id_fkey"
FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."level_assets"
ADD CONSTRAINT "level_assets_asset_id_fkey"
FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
