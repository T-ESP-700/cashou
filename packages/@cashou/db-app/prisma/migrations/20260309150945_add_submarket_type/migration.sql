-- CreateEnum
CREATE TYPE "public"."SubmarketType" AS ENUM ('Savings', 'Insurance', 'Stock');

-- AlterTable
ALTER TABLE "public"."submarkets" ADD COLUMN     "type" "public"."SubmarketType" NOT NULL DEFAULT 'Stock';
