-- AlterTable
ALTER TABLE "public"."notifications" ADD COLUMN     "event_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
