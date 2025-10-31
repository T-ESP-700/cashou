/*
  Warnings:

  - The values [quiz,news,reminder] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - The values [daily] on the enum `QuizType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('Quiz', 'News', 'Reminder', 'Profile');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "QuizType_new" AS ENUM ('Daily', 'MCQ');
ALTER TABLE "quiz" ALTER COLUMN "type" TYPE "QuizType_new" USING ("type"::text::"QuizType_new");
ALTER TYPE "QuizType" RENAME TO "QuizType_old";
ALTER TYPE "QuizType_new" RENAME TO "QuizType";
DROP TYPE "QuizType_old";
COMMIT;
