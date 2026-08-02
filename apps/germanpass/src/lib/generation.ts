/**
 * Génération de contenu original (admin) : RAG → prompt → JSON validé Zod →
 * anti-copie → création en statut PENDING_REVIEW (validation humaine obligatoire).
 */
import { z } from "zod";
import type { ExamProvider, ExamSection, Level, Prisma, TaskFormat } from "@prisma/client";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/ai";
import { searchChunks } from "@/lib/rag";
import { checkAgainstLibrary } from "@/lib/anti-copy";
import { env } from "@/lib/env";

const generatedPassageSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(50),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(3),
        explanation: z.string().min(3),
        explanationFr: z.string().min(3),
        explanationEn: z.string().min(3),
        options: z
          .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
          .min(2)
          .max(6)
          .optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .min(1),
});

const generatedLessonSchema = z.object({
  contentMd: z.string().min(200),
  helpFr: z.string().min(50),
  helpEn: z.string().min(50),
  exercises: z
    .array(
      z.object({
        taskFormat: z.enum(["MCQ_SINGLE", "TRUE_FALSE"]),
        prompt: z.string().min(3),
        options: z
          .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
          .min(2)
          .max(4)
          .nullish(),
        correct: z.boolean().nullish(),
      })
    )
    .min(3)
    .max(10),
});

export type GeneratePassageParams = {
  adminId: string;
  provider: ExamProvider;
  level: Level;
  section: ExamSection;
  taskFormat: TaskFormat;
  theme: string;
  itemCount: number;
};

export async function generatePassage(params: GeneratePassageParams): Promise<string> {
  const generation = await db.aiGeneration.create({
    data: {
      requestedById: params.adminId,
      targetType: "passage",
      provider: params.provider,
      level: params.level,
      section: params.section,
      taskFormat: params.taskFormat,
      params: { theme: params.theme, itemCount: params.itemCount },
      status: "RUNNING",
      ragChunkIds: [],
    },
  });

  try {
    const ragChunks = await searchChunks({
      query: `${params.theme} niveau ${params.level} ${params.section}`,
      level: params.level,
      topK: 6,
    }).catch(() => []);

    const system = `Tu es un concepteur pédagogique expert en allemand langue étrangère (DaF).
Tu crées du contenu d'entraînement 100 % ORIGINAL pour le niveau CECRL ${params.level}, compétence ${params.section}.
INTERDIT : reproduire ou paraphraser des sujets d'examens officiels (Goethe, ÖSD, telc, ECL).
Format de tâche : ${params.taskFormat}. Nombre de questions : ${params.itemCount}.
Réponds UNIQUEMENT en JSON : {"title": string, "body": string (texte allemand adapté au niveau, 150-400 mots selon niveau), "questions": [{"prompt": string, "explanation": string (explication pédagogique en ALLEMAND SIMPLE, adapté au niveau ${params.level}, en citant le passage pertinent), "explanationFr": string (même explication traduite en français), "explanationEn": string (même explication traduite en anglais), "options": [{"text": string, "isCorrect": boolean}]}]}.
Pour true_false : exactement 2 options ("Richtig"/"Falsch"). Pour mcq_single : 3-4 options dont UNE seule correcte.`;

    const userMsg = `Thème : ${params.theme}.
${ragChunks.length > 0 ? `Inspiration thématique et lexicale (NE PAS copier) :\n${ragChunks.map((c) => `- ${c.content.slice(0, 300)}`).join("\n")}` : ""}`;

    const raw = await chatCompletion({
      userId: params.adminId,
      kind: "generation",
      model: env.AI_MODEL_GENERATION,
      system,
      user: userMsg,
      jsonMode: true,
      temperature: 0.8,
    });

    const parsed = generatedPassageSchema.parse(JSON.parse(raw));

    // Garde anti-copie
    const antiCopy = await checkAgainstLibrary(parsed.body);
    if (!antiCopy.ok) {
      await db.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: "REJECTED",
          rejectReason: `Anti-copie : trigram=${antiCopy.maxTrigram.toFixed(2)}, embedding=${antiCopy.maxEmbedding.toFixed(2)}`,
          similarityMax: Math.max(antiCopy.maxTrigram, antiCopy.maxEmbedding),
          rawOutput: parsed as unknown as Prisma.InputJsonValue,
          ragChunkIds: ragChunks.map((c) => c.id),
        },
      });
      return generation.id;
    }

    // Création du passage + questions en attente de validation humaine
    const passage = await db.passage.create({
      data: {
        section: params.section,
        level: params.level,
        taskFormat: params.taskFormat,
        title: parsed.title,
        body: parsed.body,
        sourceOrigin: "AI_GENERATED",
        status: "PENDING_REVIEW",
        generationId: generation.id,
        providers: { create: [{ provider: params.provider }] },
        questions: {
          create: parsed.questions.map((q, i) => ({
            section: params.section,
            level: params.level,
            taskFormat: params.taskFormat,
            prompt: q.prompt,
            explanation: q.explanation,
            explanationFr: q.explanationFr,
            explanationEn: q.explanationEn,
            sourceOrigin: "AI_GENERATED",
            status: "PENDING_REVIEW",
            position: i,
            metadata: (q.metadata ?? undefined) as never,
            options: q.options
              ? { create: q.options.map((o, j) => ({ text: o.text, isCorrect: o.isCorrect, position: j })) }
              : undefined,
          })),
        },
      },
    });

    await db.aiGeneration.update({
      where: { id: generation.id },
      data: {
        status: "PENDING_REVIEW",
        resultId: passage.id,
        rawOutput: parsed as unknown as Prisma.InputJsonValue,
        similarityMax: Math.max(antiCopy.maxTrigram, antiCopy.maxEmbedding),
        ragChunkIds: ragChunks.map((c) => c.id),
      },
    });
    return generation.id;
  } catch (e) {
    await db.aiGeneration.update({
      where: { id: generation.id },
      data: { status: "FAILED", rejectReason: e instanceof Error ? e.message : "Erreur inconnue" },
    });
    throw e;
  }
}

export type GenerateLessonParams = {
  adminId: string;
  courseId: string;
  title: string;
  lernziel: string;
  exerciseCount: number;
};

/**
 * Génère une leçon complète (Markdown bilingue + exercices auto-corrigés) à
 * partir d'un titre et d'un Lernziel. Même pipeline que les passages :
 * RAG (inspiration) → JSON validé → anti-copie → PENDING_REVIEW (validation humaine).
 */
export async function generateLesson(params: GenerateLessonParams): Promise<string> {
  const course = await db.course.findUniqueOrThrow({ where: { id: params.courseId } });
  const generation = await db.aiGeneration.create({
    data: {
      requestedById: params.adminId,
      targetType: "lesson",
      level: course.level,
      params: {
        courseId: course.id,
        title: params.title,
        lernziel: params.lernziel,
        exerciseCount: params.exerciseCount,
      },
      status: "RUNNING",
      ragChunkIds: [],
    },
  });

  try {
    const ragChunks = await searchChunks({
      query: `${params.title} ${params.lernziel} niveau ${course.level}`,
      level: course.level,
      topK: 6,
    }).catch(() => []);

    const kindLabel =
      course.kind === "GRAMMAR" ? "grammaire" : course.kind === "VOCABULARY" ? "vocabulaire" : "Redemittel";

    const system = `Tu es un concepteur pédagogique expert en allemand langue étrangère (DaF), adepte de l'enseignement einsprachig (la langue cible s'enseigne dans la langue cible, calibrée au niveau).
Tu rédiges une LEÇON complète 100 % ORIGINALE de ${kindLabel} pour le niveau CECRL ${course.level}, destinée à des apprenants francophones et anglophones (Cameroun).
INTERDIT : reproduire ou paraphraser un manuel existant (Menschen, Schritte, Netzwerk...).
La leçon principale (contentMd) est ENTIÈREMENT EN ALLEMAND adapté au niveau ${course.level} (phrases ${course.level === "A1" || course.level === "A2" ? "très courtes et simples" : "adaptées au niveau"}) : ## titre, **Lernziel**, explications, exemples, tableaux Markdown si utile, courte synthèse.
En complément, tu rédiges deux blocs d'aide (Markdown) qui expliquent les points clés de la leçon : helpFr en FRANÇAIS et helpEn en ANGLAIS (traductions des exemples importants, explication des règles).
Réponds UNIQUEMENT en JSON : {"contentMd": string (leçon en ALLEMAND, SANS les exercices), "helpFr": string, "helpEn": string, "exercises": [{"taskFormat": "MCQ_SINGLE" | "TRUE_FALSE", "prompt": string (consigne en allemand), "options": [{"text": string, "isCorrect": boolean}] (MCQ_SINGLE : 3-4 options, UNE seule correcte), "correct": boolean (TRUE_FALSE uniquement)}] (exactement ${params.exerciseCount} exercices portant sur la leçon)}.`;

    const userMsg = `Leçon : « ${params.title} » — Lernziel : ${params.lernziel}. Niveau ${course.level}, cours « ${course.title} ».
${ragChunks.length > 0 ? `Inspiration thématique et lexicale (NE PAS copier) :\n${ragChunks.map((c) => `- ${c.content.slice(0, 300)}`).join("\n")}` : ""}`;

    const raw = await chatCompletion({
      userId: params.adminId,
      kind: "generation",
      model: env.AI_MODEL_GENERATION,
      system,
      user: userMsg,
      jsonMode: true,
      temperature: 0.7,
    });

    const parsed = generatedLessonSchema.parse(JSON.parse(raw));

    // Garde anti-copie sur le contenu de la leçon
    const antiCopy = await checkAgainstLibrary(parsed.contentMd);
    if (!antiCopy.ok) {
      await db.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: "REJECTED",
          rejectReason: `Anti-copie : trigram=${antiCopy.maxTrigram.toFixed(2)}, embedding=${antiCopy.maxEmbedding.toFixed(2)}`,
          similarityMax: Math.max(antiCopy.maxTrigram, antiCopy.maxEmbedding),
          rawOutput: parsed as unknown as Prisma.InputJsonValue,
          ragChunkIds: ragChunks.map((c) => c.id),
        },
      });
      return generation.id;
    }

    const position = await db.lesson.count({ where: { courseId: course.id } });
    const lesson = await db.lesson.create({
      data: {
        courseId: course.id,
        title: params.title,
        contentMd: parsed.contentMd,
        helpFr: parsed.helpFr,
        helpEn: parsed.helpEn,
        position,
        status: "PENDING_REVIEW",
        sourceOrigin: "AI_GENERATED",
        exercises: {
          create: parsed.exercises.map((ex, i) => ({
            taskFormat: ex.taskFormat,
            prompt: ex.prompt,
            metadata: (ex.taskFormat === "MCQ_SINGLE"
              ? {
                  options: (ex.options ?? []).map((o, j) => ({
                    id: `o${j + 1}`,
                    text: o.text,
                    isCorrect: o.isCorrect,
                  })),
                }
              : { correct: ex.correct === true }) as never,
            points: 1,
            isChapterTest: true,
            position: i,
          })),
        },
      },
    });

    await db.aiGeneration.update({
      where: { id: generation.id },
      data: {
        status: "PENDING_REVIEW",
        resultId: lesson.id,
        rawOutput: parsed as unknown as Prisma.InputJsonValue,
        similarityMax: Math.max(antiCopy.maxTrigram, antiCopy.maxEmbedding),
        ragChunkIds: ragChunks.map((c) => c.id),
      },
    });
    return generation.id;
  } catch (e) {
    await db.aiGeneration.update({
      where: { id: generation.id },
      data: { status: "FAILED", rejectReason: e instanceof Error ? e.message : "Erreur inconnue" },
    });
    throw e;
  }
}
