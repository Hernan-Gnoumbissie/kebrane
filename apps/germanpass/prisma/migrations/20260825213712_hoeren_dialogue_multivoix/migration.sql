-- CreateEnum
CREATE TYPE "AudioStatus" AS ENUM ('NONE', 'PENDING', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "passages" ADD COLUMN     "audioDurationSec" DOUBLE PRECISION,
ADD COLUMN     "audioError" TEXT,
ADD COLUMN     "audioFormat" TEXT,
ADD COLUMN     "audioGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "audioSegments" JSONB,
ADD COLUMN     "audioStatus" "AudioStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "dialogue" JSONB,
ADD COLUMN     "situation" TEXT,
ADD COLUMN     "speakers" JSONB;

-- Reprise de l'existant : un passage qui possede deja un fichier audio EST
-- pret, meme s'il a ete produit par l'ancien chemin a voix unique. Le laisser
-- a 'NONE' ferait croire a l'administration qu'aucun audio n'existe et
-- l'inviterait a tout regenerer, donc a repayer ce qui est deja la.
-- `audioGeneratedAt` reprend `updatedAt` : c'est la meilleure approximation
-- disponible, la date de generation n'ayant jamais ete conservee.
UPDATE "passages"
SET "audioStatus" = 'READY',
    "audioFormat" = 'mp3',
    "audioGeneratedAt" = "updatedAt"
WHERE "audioPath" IS NOT NULL;
