-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentLevel" "Level" NOT NULL DEFAULT 'A1';

-- CreateTable
CREATE TABLE "level_mastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "masteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionCount" INTEGER NOT NULL,
    "avgPct" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "level_mastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_mastery_userId_level_key" ON "level_mastery"("userId", "level");

-- AddForeignKey
ALTER TABLE "level_mastery" ADD CONSTRAINT "level_mastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
