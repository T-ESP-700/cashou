-- AlterTable: add game_instance_id to user_quiz
ALTER TABLE "user_quiz" ADD COLUMN "game_instance_id" INTEGER;

-- AddForeignKey
ALTER TABLE "user_quiz" ADD CONSTRAINT "user_quiz_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
