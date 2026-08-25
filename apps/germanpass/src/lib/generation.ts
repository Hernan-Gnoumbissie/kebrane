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
import { locuteursCibles, situationParCle, type NiveauCecrl } from "@/lib/hoeren/situations";
import { systemeDialogue, utilisateurDialogue } from "@/lib/hoeren/prompt";
import {
  dialogueGenereSchema,
  transcript,
  validerCasting,
  validerDialogue,
  versPersonnagesDemandes,
} from "@/lib/hoeren/dialogue";
import { casterPersonnages } from "@/lib/hoeren/voices";

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
        // Un TRUE_FALSE n'a pas d'options, et le modèle l'exprime par un
        // tableau VIDE plutôt qu'en omettant la clé. Sans ce prétraitement,
        // `.min(2)` rejetait la génération entière pour un exercice
        // parfaitement valide (KB-38).
        options: z.preprocess(
          (v) => (Array.isArray(v) && v.length === 0 ? undefined : v),
          z
            .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
            .min(2)
            .max(4)
            .nullish()
        ),
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
  /**
   * Hören uniquement : clé de situation (ALLTAG, ARZTBESUCH…). Sa présence
   * bascule la génération vers un dialogue structuré multi-voix. Absente, on
   * reste sur le chemin texte historique — y compris pour un Hören, ce qui
   * permet de continuer à produire un monologue simple.
   */
  situation?: string;
};

export async function generatePassage(params: GeneratePassageParams): Promise<string> {
  if (params.section === "HOEREN" && params.situation) {
    return generateDialogueHoeren({ ...params, situation: params.situation });
  }
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
      // Basse a dessein (KB-38). A 0.8, le modele s'ecartait du theme demande :
      // une generation d'alphabet A1 est revenue en lecon sur les pronoms. Un
      // contenu pedagogique n'a pas besoin de creativite, il a besoin de suivre
      // la consigne — la variete vient du theme, pas du hasard.
      temperature: 0.3,
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

/**
 * Génération d'un dialogue Hören multi-voix.
 *
 * Même ossature que `generatePassage` — traçage AiGeneration, RAG, anti-copie,
 * création en PENDING_REVIEW — mais la sortie du modèle est un dialogue
 * structuré, validé, puis casté sur des voix DISTINCTES avant d'être écrit.
 *
 * L'audio n'est PAS généré ici : le passage naît en `audioStatus: PENDING`, et
 * c'est l'administration qui déclenche la synthèse une fois le texte relu. On
 * ne dépense pas en TTS pour un dialogue qui sera peut-être rejeté.
 */
async function generateDialogueHoeren(
  params: GeneratePassageParams & { situation: string }
): Promise<string> {
  const situation = situationParCle(params.situation);
  if (!situation) throw new Error(`Situation inconnue : ${params.situation}`);

  const niveau = params.level as NiveauCecrl;
  const locuteurs = locuteursCibles(situation, niveau);

  const generation = await db.aiGeneration.create({
    data: {
      requestedById: params.adminId,
      targetType: "passage",
      provider: params.provider,
      level: params.level,
      section: params.section,
      taskFormat: params.taskFormat,
      params: { theme: params.theme, itemCount: params.itemCount, situation: params.situation },
      status: "RUNNING",
      ragChunkIds: [],
    },
  });

  try {
    const ragChunks = await searchChunks({
      query: `${params.theme} ${situation.libelle} niveau ${params.level} Hören`,
      level: params.level,
      topK: 6,
    }).catch(() => []);

    const raw = await chatCompletion({
      userId: params.adminId,
      kind: "generation",
      model: env.AI_MODEL_GENERATION,
      system: systemeDialogue({
        niveau,
        situation,
        locuteurs,
        itemCount: params.itemCount,
      }),
      user: utilisateurDialogue({
        theme: params.theme,
        extraitsRag: ragChunks.map((c) => c.content),
      }),
      jsonMode: true,
      temperature: 0.4,
    });

    const dialogue = dialogueGenereSchema.parse(JSON.parse(raw));

    // Validation AVANT toute dépense : un dialogue mal formé rejeté ici coûte
    // zéro, le même rejeté après synthèse coûte un appel TTS par réplique.
    const problemes = validerDialogue(dialogue, niveau);
    if (problemes.length > 0) {
      await db.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: "REJECTED",
          rejectReason: problemes.map((p) => `${p.code}: ${p.message}`).join(" | "),
          rawOutput: dialogue as unknown as Prisma.InputJsonValue,
          ragChunkIds: ragChunks.map((c) => c.id),
        },
      });
      return generation.id;
    }

    const texte = transcript(dialogue);
    const antiCopy = await checkAgainstLibrary(texte);
    if (!antiCopy.ok) {
      await db.aiGeneration.update({
        where: { id: generation.id },
        data: {
          status: "REJECTED",
          rejectReason: `Anti-copie : trigram=${antiCopy.maxTrigram.toFixed(2)}, embedding=${antiCopy.maxEmbedding.toFixed(2)}`,
          similarityMax: Math.max(antiCopy.maxTrigram, antiCopy.maxEmbedding),
          rawOutput: dialogue as unknown as Prisma.InputJsonValue,
          ragChunkIds: ragChunks.map((c) => c.id),
        },
      });
      return generation.id;
    }

    // Casting : c'est ici que chaque personnage reçoit SA voix, distincte de
    // celle des autres. L'invariant est vérifié juste après, parce qu'un
    // dialogue à voix unique est précisément le défaut qu'on corrige.
    const castes = casterPersonnages(versPersonnagesDemandes(dialogue));
    const soucisCasting = validerCasting(castes);
    if (soucisCasting.length > 0) {
      throw new Error(soucisCasting.map((p) => p.message).join(" | "));
    }

    const passage = await db.passage.create({
      data: {
        section: params.section,
        level: params.level,
        taskFormat: params.taskFormat,
        title: dialogue.title,
        // `body` reste le transcript : le RAG, l'anti-copie, la relecture
        // admin et tous les écrans existants continuent d'y lire ce qu'ils y
        // ont toujours lu. La structure vit à côté, elle ne la remplace pas.
        body: texte,
        situation: params.situation,
        speakers: castes as unknown as Prisma.InputJsonValue,
        dialogue: dialogue.dialogue as unknown as Prisma.InputJsonValue,
        audioStatus: "PENDING",
        sourceOrigin: "AI_GENERATED",
        status: "PENDING_REVIEW",
        generationId: generation.id,
        providers: { create: [{ provider: params.provider }] },
        questions: {
          create: dialogue.questions.map((q, i) => ({
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
            options: q.options
              ? {
                  create: q.options.map((o, j) => ({
                    text: o.text,
                    isCorrect: o.isCorrect,
                    position: j,
                  })),
                }
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
        rawOutput: dialogue as unknown as Prisma.InputJsonValue,
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

    // Le SUJET est répété dans le message système (KB-38). Il n'y figurait que
    // côté utilisateur, et le modèle l'ignorait : deux demandes distinctes —
    // l'alphabet, puis les nombres — ont produit la même leçon sur les pronoms
    // personnels. Ce n'était pas de l'aléatoire mais l'inverse : face à un
    // système long et prescriptif, il rendait la leçon de grammaire A1 la plus
    // canonique qui soit. Baisser la température aggravait donc le problème au
    // lieu de le résoudre.
    const contrainteSujet = `\n\nSUJET IMPOSÉ, non négociable : « ${params.title} ». Lernziel : ${params.lernziel}.
La leçon entière — titre, explications, exemples, exercices — porte sur CE sujet et sur aucun autre. Ne remplace jamais ce sujet par un thème plus courant du niveau.`;

    const userMsg = `Leçon : « ${params.title} » — Lernziel : ${params.lernziel}. Niveau ${course.level}, cours « ${course.title} ».
${ragChunks.length > 0 ? `Inspiration thématique et lexicale (NE PAS copier) :\n${ragChunks.map((c) => `- ${c.content.slice(0, 300)}`).join("\n")}` : ""}`;

    const raw = await chatCompletion({
      userId: params.adminId,
      kind: "generation",
      model: env.AI_MODEL_GENERATION,
      system: system + contrainteSujet,
      user: userMsg,
      jsonMode: true,
      // Meme raison qu'en generation de passage : on veut de l'obeissance au
      // Lernziel, pas de l'invention.
      temperature: 0.2,
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
