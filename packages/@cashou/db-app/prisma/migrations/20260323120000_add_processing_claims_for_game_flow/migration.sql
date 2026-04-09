ALTER TABLE "game_instances"
ADD COLUMN "ending_started_at" TIMESTAMP(3);

ALTER TABLE "game_instance_events"
ADD COLUMN "processing_started_at" TIMESTAMP(3);
