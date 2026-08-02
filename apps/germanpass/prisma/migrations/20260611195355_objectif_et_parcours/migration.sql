-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FULL', 'EXAM_PREP');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "explanationEn" TEXT,
ADD COLUMN     "explanationFr" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FULL',
ADD COLUMN     "targetLevel" "Level",
ADD COLUMN     "targetProvider" "ExamProvider";
