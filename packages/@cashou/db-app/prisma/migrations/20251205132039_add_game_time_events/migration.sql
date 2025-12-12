-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'Event';
ALTER TYPE "public"."NotificationType" ADD VALUE 'GameEnd';

-- AlterTable
ALTER TABLE "public"."game_instances" ADD COLUMN     "current_event_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ended_at" TIMESTAMP(3),
ADD COLUMN     "is_ended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "total_paused_duration" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."level_events" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "trigger_percent" INTEGER NOT NULL DEFAULT 50;

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "expo_push_token" TEXT;
