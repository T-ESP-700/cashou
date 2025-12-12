-- DropForeignKey
ALTER TABLE "public"."game_instance_events" DROP CONSTRAINT "game_instance_events_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."game_users" DROP CONSTRAINT "game_users_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."holdings" DROP CONSTRAINT "holdings_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."submarkets" DROP CONSTRAINT "submarkets_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_game_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."wallets" DROP CONSTRAINT "wallets_game_instance_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."submarkets" ADD CONSTRAINT "submarkets_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_instance_events" ADD CONSTRAINT "game_instance_events_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."game_users" ADD CONSTRAINT "game_users_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holdings" ADD CONSTRAINT "holdings_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_game_instance_id_fkey" FOREIGN KEY ("game_instance_id") REFERENCES "public"."game_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
