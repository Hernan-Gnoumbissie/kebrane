/**
 * Génération TTS : audios Hören (dialogues multi-voix), exemples de leçons,
 * flashcards.
 *
 * Deux chemins cohabitent, volontairement :
 *
 *  - DIALOGUE : le passage porte `speakers` + `dialogue`. Chaque réplique est
 *    synthétisée avec la voix de son personnage, puis les segments sont
 *    assemblés en PCM et encodés une seule fois en MP3.
 *
 *  - HÉRITÉ : tout le reste — leçons, flashcards, et les passages Hören créés
 *    avant cette refonte, qui n'ont qu'un `body`. Une voix, un appel. Ce chemin
 *    n'est pas déprécié : il reste correct pour un monologue, et surtout il
 *    garantit que les anciens exercices continuent de fonctionner.
 */
import { PrismaClient, type Level } from "@prisma/client";
import { tts } from "@/lib/ai";
import { saveFile } from "@/lib/storage";
import { env } from "@/lib/env";
import { encoderMp3 } from "@/lib/hoeren/mp3";
import { dureeEstimeeSecondes, type DialogueGenere } from "@/lib/hoeren/dialogue";
import { PROFILS_NIVEAU, type NiveauCecrl } from "@/lib/hoeren/situations";
import { synthetiserDialogue, validerAudioAssemble } from "@/lib/hoeren/synthese";
import type { PersonnageCaste } from "@/lib/hoeren/voices";

const db = new PrismaClient();

/** Voix par variété — chemin hérité (une seule voix pour tout le texte). */
const VOICES: Record<string, string[]> = {
  DE: ["alloy", "echo", "onyx"],
  AT: ["fable", "nova"],
  CH: ["shimmer"],
};

/** Vitesse selon niveau : plus lent en A1/A2. */
export function speedForLevel(level: string): number {
  const profil = PROFILS_NIVEAU[level as NiveauCecrl];
  return profil?.vitesse ?? 1.0;
}

/**
 * Modèle des dialogues : seul `gpt-4o-mini-tts` accepte `instructions`, donc
 * seul lui permet de diriger l'intonation par personnage. Surchargeable pour
 * revenir en arrière sans redéployer.
 */
function modeleDialogue(): string {
  return env.TTS_DIALOGUE_MODEL || "gpt-4o-mini-tts";
}

type PassageDialogue = {
  id: string;
  level: Level;
  situation: string | null;
  speakers: unknown;
  dialogue: unknown;
};

/** Le passage porte-t-il un vrai dialogue structuré ? */
function litDialogue(passage: PassageDialogue): {
  castes: PersonnageCaste[];
  repliques: DialogueGenere["dialogue"];
} | null {
  const castes = passage.speakers as PersonnageCaste[] | null;
  const repliques = passage.dialogue as DialogueGenere["dialogue"] | null;
  if (!Array.isArray(castes) || castes.length === 0) return null;
  if (!Array.isArray(repliques) || repliques.length === 0) return null;
  return { castes, repliques };
}

export async function runTtsJob(audioJobId: string): Promise<void> {
  const job = await db.audioJob.findUnique({
    where: { id: audioJobId },
    include: { passage: true },
  });
  if (!job) return;

  await db.audioJob.update({ where: { id: audioJobId }, data: { status: "RUNNING" } });
  if (job.passageId) {
    await db.passage.update({
      where: { id: job.passageId },
      data: { audioStatus: "GENERATING", audioError: null },
    });
  }

  try {
    const structure = job.passage ? litDialogue(job.passage) : null;

    const { outputPath, dureeSecondes, segments } = structure
      ? await genererDialogue(job.passage!, structure, job.id)
      : await genererMonovoix(job);

    await db.audioJob.update({
      where: { id: audioJobId },
      data: { status: "DONE", outputPath, error: null },
    });

    // Propagation du chemin audio sur la cible
    if (job.targetType === "passage" && job.passageId) {
      await db.passage.update({
        where: { id: job.passageId },
        data: {
          audioPath: outputPath,
          audioStatus: "READY",
          audioFormat: "mp3",
          audioDurationSec: dureeSecondes,
          audioGeneratedAt: new Date(),
          audioSegments: segments ?? undefined,
          audioError: null,
        },
      });
    } else if (job.targetType === "lesson" && job.targetId) {
      await db.lesson.update({ where: { id: job.targetId }, data: { audioPath: outputPath } });
    } else if (job.targetType === "flashcard" && job.targetId) {
      await db.flashcard.update({ where: { id: job.targetId }, data: { audioPath: outputPath } });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    await db.audioJob.update({
      where: { id: audioJobId },
      data: { status: "FAILED", error: message },
    });
    // Le passage repasse en FAILED et NON en READY : un exercice partiellement
    // généré ne doit jamais se présenter comme terminé. On ne touche pas à
    // `audioPath` — s'il existait un audio valide avant, il reste jouable.
    if (job.passageId) {
      await db.passage.update({
        where: { id: job.passageId },
        data: { audioStatus: "FAILED", audioError: message },
      });
    }
    throw e;
  }
}

/** Chemin dialogue : une voix par personnage, assemblage, encodage unique. */
async function genererDialogue(
  passage: PassageDialogue,
  structure: { castes: PersonnageCaste[]; repliques: DialogueGenere["dialogue"] },
  jobId: string
): Promise<{ outputPath: string; dureeSecondes: number; segments: unknown }> {
  const niveau = passage.level as NiveauCecrl;
  const modele = modeleDialogue();

  const resultat = await synthetiserDialogue(
    {
      repliques: structure.repliques,
      castes: structure.castes,
      niveau,
      modele,
      decor: passage.situation ?? undefined,
      userId: null,
    },
    tts
  );

  const estimee = dureeEstimeeSecondes(
    { dialogue: structure.repliques } as DialogueGenere,
    PROFILS_NIVEAU[niveau]?.vitesse ?? 1
  );
  const refus = validerAudioAssemble(resultat, {
    repliques: structure.repliques.length,
    dureeEstimeeSecondes: estimee,
  });
  if (refus.length > 0) {
    throw new Error(`Audio refusé à la validation : ${refus.join(" ")}`);
  }

  if (resultat.incidents.length > 0) {
    // Journalisé même en cas de succès : un dialogue qui a nécessité un
    // changement de voix est publiable, mais l'admin doit pouvoir le savoir.
    console.warn(`[tts/${jobId}] incidents : ${resultat.incidents.join(" | ")}`);
  }

  const mp3 = await encoderMp3(resultat.echantillons);
  const outputPath = await saveFile(mp3, "tts", "mp3");

  // Le casting effectif est réécrit : si une voix a échoué et qu'un personnage
  // a été recasté, la base doit refléter ce qu'on entend, pas ce qu'on visait.
  await db.passage.update({
    where: { id: passage.id },
    data: { speakers: resultat.castes as never },
  });

  return {
    outputPath,
    dureeSecondes: resultat.dureeSecondes,
    segments: resultat.segments,
  };
}

/** Chemin hérité : un texte, une voix. Leçons, flashcards, anciens passages. */
async function genererMonovoix(job: {
  targetType: string;
  targetId: string | null;
  variety: string;
  voice: string;
  speed: number;
  passage: { body: string } | null;
}): Promise<{ outputPath: string; dureeSecondes: number | null; segments: null }> {
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
  const voice =
    job.voice && job.voice !== "auto"
      ? job.voice
      : (voices[Math.floor(Math.random() * voices.length)] ?? "alloy");

  const audio = await tts({ text, voice, speed: job.speed });
  const outputPath = await saveFile(audio, "tts", "mp3");
  return { outputPath, dureeSecondes: null, segments: null };
}
