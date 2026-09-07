-- CreateEnum
CREATE TYPE "ActiviteLecon" AS ENUM ('CONTENU', 'AUDIO', 'EXERCICES');

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "prochaineTentativeLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "estTestChapitre" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "progression_activite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "activite" "ActiviteLecon" NOT NULL,
    "termineeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progression_activite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progression_activite_userId_lessonId_idx" ON "progression_activite"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "progression_activite_userId_lessonId_activite_key" ON "progression_activite"("userId", "lessonId", "activite");

-- AddForeignKey
ALTER TABLE "progression_activite" ADD CONSTRAINT "progression_activite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_activite" ADD CONSTRAINT "progression_activite_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
