/**
 * Pipeline Sprechen asynchrone : audio → STT → métriques → évaluation IA
 * de la transcription → restitution annotée.
 * La note orale est INDICATIVE (l'évaluation de la prononciation est approximative).
 */
import path from "node:path";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { stt, chatCompletion } from "@/lib/ai";
import { computeSpeechMetrics } from "@/lib/speech-metrics";
import { env } from "@/lib/env";

const db = new PrismaClient();

const speakingFeedbackSchema = z.object({
  scores: z.object({
    taskAchievement: z.number().min(0).max(10),
    vocabulary: z.number().min(0).max(10),
    grammar: z.number().min(0).max(10),
    fluencyEstimate: z.number().min(0).max(10),
  }),
  totalIndicative: z.number().min(0).max(40),
  estimatedLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  annotatedTranscript: z.string(),
  errors: z.array(
    z.object({
      type: z.enum(["Grammatik", "Wortschatz", "Syntax", "Kohärenz", "Register", "Rechtschreibung"]),
      excerpt: z.string(),
      correction: z.string(),
      explanationDe: z.string(),
      explanationNative: z.string(),
    })
  ),
  recommendationsDe: z.array(z.string()).min(1),
  recommendationsNative: z.array(z.string()).min(1),
  summaryDe: z.string(),
  summaryNative: z.string(),
});

export async function evaluateSpeaking(submissionId: string): Promise<void> {
  const submission = await db.speakingSubmission.findUnique({
    where: { id: submissionId },
    include: { speakingTask: true, user: { select: { localePref: true } } },
  });
  if (!submission) return;
  const nativeLang = submission.user.localePref === "en" ? "en" : "fr";
  const nativeLabel = nativeLang === "en" ? "ANGLAIS (English)" : "FRANÇAIS";

  try {
    // 1. STT
    await db.speakingSubmission.update({ where: { id: submissionId }, data: { status: "TRANSCRIBING" } });
    const storageDir = process.env.STORAGE_DIR ?? "./storage";
    const audio = await readFile(path.join(storageDir, submission.audioPath));
    const ext = submission.audioPath.split(".").pop() ?? "webm";
    const transcript = await stt({ audio, filename: `speech.${ext}`, userId: submission.userId });

    // 2. Métriques déterministes
    const durationSec = submission.durationSec ?? submission.speakingTask.speakTimeSec;
    const metrics = computeSpeechMetrics(transcript, durationSec);

    // 3. Évaluation IA de la transcription
    await db.speakingSubmission.update({
      where: { id: submissionId },
      data: { status: "EVALUATING", transcript },
    });

    const task = submission.speakingTask;
    const system = `Tu es un examinateur certifié DaF, critères publics ${task.provider} niveau ${task.level}, épreuve orale partie ${task.partNumber} (${task.taskFormat}).
Tu évalues la TRANSCRIPTION d'une production orale (la prononciation n'est PAS évaluable — la note est indicative).
Métriques mesurées : ${metrics.wpm} mots/min, ratio de répétitions ${metrics.repetitionRatio}, ${metrics.hesitationCount} hésitations, ${metrics.wordCount} mots pour ${durationSec}s de parole attendue.
Réponds UNIQUEMENT en JSON strict :
{"scores": {"taskAchievement": 0-10, "vocabulary": 0-10, "grammar": 0-10, "fluencyEstimate": 0-10},
 "totalIndicative": 0-40, "estimatedLevel": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",
 "annotatedTranscript": string (transcription avec les erreurs balisées **erreur**),
 "errors": [{"type": "Grammatik"|"Wortschatz"|"Syntax"|"Kohärenz"|"Register"|"Rechtschreibung", "excerpt": string, "correction": string, "explanationDe": string, "explanationNative": string}],
 "recommendationsDe": [string], "recommendationsNative": [string], "summaryDe": string, "summaryNative": string}
Les champs *De sont en ALLEMAND SIMPLE adapté au niveau ${task.level} ; les champs *Native sont la même chose en ${nativeLabel}. Corrections toujours en ALLEMAND. Max 10 erreurs.`;

    const userMsg = `TÂCHE (${task.title}) :
${task.instructions}

TRANSCRIPTION DU CANDIDAT :
${transcript}`;

    const raw = await chatCompletion({
      userId: submission.userId,
      kind: "speaking_eval",
      model: env.AI_MODEL_EVALUATION,
      system,
      user: userMsg,
      jsonMode: true,
      temperature: 0.2,
    });
    const feedback = speakingFeedbackSchema.parse(JSON.parse(raw));

    // Recalcul déterministe du total
    const s = feedback.scores;
    const total = Math.round((s.taskAchievement + s.vocabulary + s.grammar + s.fluencyEstimate) * 10) / 10;

    await db.speakingSubmission.update({
      where: { id: submissionId },
      data: {
        status: "COMPLETED",
        scores: { ...s, totalIndicative: total, estimatedLevel: feedback.estimatedLevel },
        feedback: {
          lang: nativeLang,
          annotatedTranscript: feedback.annotatedTranscript,
          metrics,
          errors: feedback.errors,
          recommendationsDe: feedback.recommendationsDe,
          recommendationsNative: feedback.recommendationsNative,
          summaryDe: feedback.summaryDe,
          summaryNative: feedback.summaryNative,
        },
        error: null,
      },
    });
    console.log(`[speaking] ${submissionId} évalué (${total}/40 indicatif)`);
  } catch (e) {
    await db.speakingSubmission.update({
      where: { id: submissionId },
      data: { status: "FAILED", error: e instanceof Error ? e.message : "Erreur inconnue" },
    });
    throw e;
  }
}
