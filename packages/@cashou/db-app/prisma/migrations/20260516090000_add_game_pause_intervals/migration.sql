CREATE TABLE "public"."game_instance_pause_intervals" (
    "id" SERIAL NOT NULL,
    "game_instance_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_instance_pause_intervals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "game_instance_pause_intervals_game_instance_id_idx"
ON "public"."game_instance_pause_intervals"("game_instance_id");

CREATE INDEX "game_instance_pause_intervals_game_instance_id_started_at_idx"
ON "public"."game_instance_pause_intervals"("game_instance_id", "started_at");

ALTER TABLE "public"."game_instance_pause_intervals"
ADD CONSTRAINT "game_instance_pause_intervals_game_instance_id_fkey"
FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
