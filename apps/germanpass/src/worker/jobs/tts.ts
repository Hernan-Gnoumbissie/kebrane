/**
 * Génération TTS : audios Hören (variété de voix, vitesse selon niveau),
 * exemples de leçons, flashcards.
 */
import { PrismaClient } from "@prisma/client";
import { tts } from "@/lib/ai";
import { saveFile } from "@/lib/storage";

const db = new PrismaClient();

/** Voix par variété — mapping ajustable selon le fournisseur TTS. */
const VOICES: Record<string, string[]> = {
  DE: ["alloy", "echo", "onyx"],
  AT: ["fable", "nova"],
  CH: ["shimmer"],
};

/** Vitesse selon niveau : plus lent en A1/A2. */
export function speedForLevel(level: string): number {
  switch (level) {
    case "A1":
      return 0.85;
    case "A2":
      return 0.9;
    case "B1":
      return 0.95;
    default:
      return 1.0;
  }
}

export async function runTtsJob(audioJobId: string): Promise<void> {
  const job = await db.audioJob.findUnique({ where: { id: audioJobId }, include: { passage: true } });
  if (!job) return;

  await db.audioJob.update({ where: { id: audioJobId }, data: { status: "RUNNING" } });

  try {
    let text: string | null = null;
    if (job.targetType === "passage" && job.passage) {
      text = job.passage.body;
    } else if (job.targetType === "lesson" && job.targetId) {
      const lesson = await db.lesson.findUnique({ where: { id: job.targetId } });
      text = lesson?.contentMd.replace(/[#*_`|>-]/g, " ") ?? null;
    } else if (job.targetType === "flashcard" && job.targetId) {
      const card = await db.flashcard.findUnique({ where: { id: job.targetId } });
      text = card ? `${card.article ? `${card.article} ` : ""}${card.front}. ${card.exampleDe}` : null;
    }
    if (!text) throw new Error("Texte source introuvable");

    const voices = VOICES[job.variety] ?? VOICES.DE ?? ["alloy"];
    const voice = job.voice && job.voice !== "auto" ? job.voice : voices[Math.floor(Math.random() * voices.length)] ?? "alloy";

    const audio = await tts({ text, voice, speed: job.speed });
    const outputPath = await saveFile(audio, "tts", "mp3");

    await db.audioJob.update({
      where: { id: audioJobId },
      data: { status: "DONE", outputPath, error: null },
    });

    // Propagation du chemin audio sur la cible
    if (job.targetType === "passage" && job.passageId) {
      await db.passage.update({ where: { id: job.passageId }, data: { audioPath: outputPath } });
    } else if (job.targetType === "lesson" && job.targetId) {
      await db.lesson.update({ where: { id: job.targetId }, data: { audioPath: outputPath } });
    } else if (job.targetType === "flashcard" && job.targetId) {
      await db.flashcard.update({ where: { id: job.targetId }, data: { audioPath: outputPath } });
    }
  } catch (e) {
    await db.audioJob.update({
      where: { id: audioJobId },
      data: { status: "FAILED", error: e instanceof Error ? e.message : "Erreur inconnue" },
    });
    throw e;
  }
}
