-- CreateEnum
CREATE TYPE "ImpactType" AS ENUM ('Price', 'Rate');

-- AlterTable
ALTER TABLE "impacts" ADD COLUMN     "impact_type" "ImpactType" NOT NULL DEFAULT 'Price';
