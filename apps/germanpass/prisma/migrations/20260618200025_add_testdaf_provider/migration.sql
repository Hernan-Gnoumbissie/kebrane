-- AlterEnum
ALTER TYPE "ExamProvider" ADD VALUE 'TESTDAF';

-- CreateIndex
CREATE INDEX "lesson_progress_userId_status_idx" ON "lesson_progress"("userId", "status");
