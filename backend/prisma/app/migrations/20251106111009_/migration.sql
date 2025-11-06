-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('Daily', 'MCQ');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('Quiz', 'News', 'Reminder', 'Profile');

-- CreateTable
CREATE TABLE "public"."levels" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "number" INTEGER,
    "duration" INTEGER,
    "speed" INTEGER,
    "start_balance" INTEGER,
    "points_required" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "has_impact" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goals" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."level_goals" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "goal_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."level_events" (
    "id" SERIAL NOT NULL,
    "level_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "username" TEXT,
    "discriminator" TEXT,
    "email" TEXT,
    "password_hash" TEXT,
    "last_activity" TIMESTAMP(3),
    "level_id" INTEGER NOT NULL,
    "points" INTEGER,
    "badges" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "amount" DECIMAL(65,30),
    "game_instance_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_instances" (
    "id" SERIAL NOT NULL,
    "type" TEXT,
    "user_id" INTEGER,
    "level_id" INTEGER,
    "start_balance" INTEGER,
    "is_paused" BOOLEAN,
    "action_required" BOOLEAN,
    "paused_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."game_users" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "game_instance_id" INTEGER,
    "is_creator" BOOLEAN,
    "join_at" TIMESTAMP(3),
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assets" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "symbol" TEXT,
    "field" TEXT,
    "description" TEXT,
    "market_id" INTEGER,
    "submarket_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."asset_histories" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER,
    "timestamp" TIMESTAMP(3),
    "value" INTEGER,
    "volume" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."event_assets" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER,
    "event_id" INTEGER,
    "date" TIMESTAMP(3),
    "value" INTEGER,
    "volume" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."impacts" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER,
    "field_id" INTEGER,
    "submarket_id" INTEGER,
    "coef" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fields" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."markets" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "current_trends" TEXT,
    "data_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submarkets" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "current_trends" TEXT,
    "data_source" TEXT,
    "market_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submarkets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER,
    "asset_id" INTEGER,
    "game_instance_id" INTEGER,
    "type" TEXT,
    "quantity" INTEGER,
    "unit_price" DECIMAL(65,30),
    "total_value" DECIMAL(65,30),
    "transaction_date" TIMESTAMP(3),
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz" (
    "id" SERIAL NOT NULL,
    "type" "public"."QuizType",
    "title" TEXT,
    "date" TIMESTAMP(3),
    "level_id" INTEGER,
    "context" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_quiz" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER,
    "user_id" INTEGER,
    "completed_at" TIMESTAMP(3),
    "is_correct" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" SERIAL NOT NULL,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."answers" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER,
    "text" TEXT,
    "is_correct" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_answers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "question_id" INTEGER,
    "answer_id" INTEGER,
    "accurate" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_questions" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER,
    "question_id" INTEGER,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" TEXT,
    "message" TEXT,
    "type" "public"."NotificationType",
    "type_id" INTEGER,
    "is_opened" BOOLEAN,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."level_goals" ADD CONSTRAINT "level_goals_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."level_goals" ADD CONSTRAINT "level_goals_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."level_events" ADD CONSTRAINT "level_events_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."level_events" ADD CONSTRAINT "level_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_instances" ADD CONSTRAINT "game_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_instances" ADD CONSTRAINT "game_instances_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_users" ADD CONSTRAINT "game_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_users" ADD CONSTRAINT "game_users_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assets" ADD CONSTRAINT "assets_submarket_id_fkey" FOREIGN KEY ("submarket_id") REFERENCES "public"."submarkets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."asset_histories" ADD CONSTRAINT "asset_histories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_assets" ADD CONSTRAINT "event_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_assets" ADD CONSTRAINT "event_assets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."impacts" ADD CONSTRAINT "impacts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."impacts" ADD CONSTRAINT "impacts_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."impacts" ADD CONSTRAINT "impacts_submarket_id_fkey" FOREIGN KEY ("submarket_id") REFERENCES "public"."submarkets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fields" ADD CONSTRAINT "fields_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submarkets" ADD CONSTRAINT "submarkets_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz" ADD CONSTRAINT "quiz_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_quiz" ADD CONSTRAINT "user_quiz_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_quiz" ADD CONSTRAINT "user_quiz_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answers" ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_answers" ADD CONSTRAINT "user_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_answers" ADD CONSTRAINT "user_answers_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "public"."answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_questions" ADD CONSTRAINT "quiz_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
