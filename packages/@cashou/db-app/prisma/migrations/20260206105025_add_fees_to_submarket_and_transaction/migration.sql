-- AlterTable
ALTER TABLE "public"."submarkets" ADD COLUMN     "entry_fee" DOUBLE PRECISION,
ADD COLUMN     "exit_fee" DOUBLE PRECISION,
ADD COLUMN     "management_fee" DOUBLE PRECISION,
ADD COLUMN     "max_amount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "fee_amount" DECIMAL(65,30),
ADD COLUMN     "fee_percent" DOUBLE PRECISION;
