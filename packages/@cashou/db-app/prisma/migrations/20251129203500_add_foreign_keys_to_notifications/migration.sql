/*
  Warnings:

  - You are about to drop the column `type_id` on the `notifications` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "type_id",
ADD COLUMN     "game_instance_id" INTEGER,
ADD COLUMN     "quiz_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;
