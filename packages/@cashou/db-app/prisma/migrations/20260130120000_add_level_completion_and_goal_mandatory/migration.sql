-- AlterTable
ALTER TABLE "level_goals" ADD COLUMN "is_mandatory" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "user_level_completions" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "level_id" INTEGER NOT NULL,
    "stars" INTEGER NOT NULL,
    "mandatory_goals_met" BOOLEAN NOT NULL,
    "bonus_goals_met" BOOLEAN NOT NULL,
    "quiz_passed" BOOLEAN NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_level_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_level_completions_user_id_level_id_key" ON "user_level_completions"("user_id", "level_id");

-- AddForeignKey
ALTER TABLE "user_level_completions" ADD CONSTRAINT "user_level_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_level_completions" ADD CONSTRAINT "user_level_completions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
