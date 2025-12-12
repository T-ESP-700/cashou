-- CreateTable
CREATE TABLE "public"."game_instance_events" (
    "id" SERIAL NOT NULL,
    "game_instance_id" INTEGER NOT NULL,
    "level_event_id" INTEGER NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_instance_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."game_instance_events" ADD CONSTRAINT "game_instance_events_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_instance_events" ADD CONSTRAINT "game_instance_events_level_event_id_fkey" FOREIGN KEY ("level_event_id") REFERENCES "public"."level_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
