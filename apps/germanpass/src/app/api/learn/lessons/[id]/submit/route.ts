import { z } from "zod";
import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { gradeAnswer, type GradableQuestion } from "@/lib/correction";
import { LEVEL_ORDER } from "@/lib/level-progression";
import {
  SEUIL_REUSSITE,
  exercicesAccessibles,
  minutesAvantNouvelleTentative,
  nouvelleTentativePossible,
  prochaineTentativeApresEchec,
  type ActiviteLecon,
  type EtatLecon,
  type Lecon,
} from "@/lib/progression-curriculum";

// Le seuil etait redefini ici a 70. Il vient desormais du module de regles :
// deux constantes pour un meme seuil finissent toujours par diverger.
const CHAPTER_PASS_THRESHOLD = SEUIL_REUSSITE;

const schema = z.object({
  answers: z.array(z.object({ exerciseId: z.string(), response: z.unknown() })).min(1),
});

/**
 * Correction serveur des exercices de leçon (mêmes formats que le moteur).
 * Le chapitre est validé si le mini-test atteint ≥ 70 %.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    const lesson = await db.lesson.findFirst({
      where: { id, status: "PUBLISHED" },
      include: { exercises: true, course: { select: { level: true } } },
    });
    if (!lesson) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    // Garde : niveau du cours verrouillé. En PREMIER — c'est la garde la plus
    // large, et la placer apres aurait fait deux requetes pour rien.
    if (LEVEL_ORDER.indexOf(lesson.course.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    // ── Règles de progression (UX-08) ──
    // Vérifiées ICI et pas seulement à l'affichage : une garde qui ne vit que
    // dans l'interface ne protège que l'interface.
    const [activites, progressionActuelle] = await Promise.all([
      db.progressionActivite.findMany({
        where: { userId: user.id, lessonId: lesson.id },
        select: { activite: true },
      }),
      db.lessonProgress.findUnique({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        select: { prochaineTentativeLe: true },
      }),
    ]);

    const lecon: Lecon = {
      id: lesson.id,
      aAudio: Boolean(lesson.audioPath),
      estTestChapitre: lesson.estTestChapitre,
    };
    const etat: EtatLecon = {
      activitesTerminees: activites.map((a) => a.activite as ActiviteLecon),
      meilleurScore: null,
      prochaineTentativeLe: progressionActuelle?.prochaineTentativeLe ?? null,
    };

    // L'accès au quiz n'est conditionné QUE par le fait d'avoir suivi le cours,
    // jamais par un score — règle explicite du PO.
    if (!exercicesAccessibles(lecon, etat)) {
      return Response.json(
        {
          error: {
            code: "CONTENU_NON_SUIVI",
            message: "Terminez d'abord la leçon avant de répondre aux exercices.",
          },
        },
        { status: 403 }
      );
    }

    const maintenant = new Date();
    if (!nouvelleTentativePossible(etat, maintenant)) {
      const minutes = minutesAvantNouvelleTentative(etat, maintenant);
      return Response.json(
        {
          error: {
            code: "REVISION_EN_COURS",
            // Formulé comme une consolidation, pas comme une sanction : on dit
            // quoi faire du délai, et combien il reste.
            message: `Relisez la leçon : vous pourrez retenter dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
            minutesRestantes: minutes,
          },
        },
        { status: 429 }
      );
    }

    const exMap = new Map(lesson.exercises.map((ex) => [ex.id, ex]));
    let points = 0;
    let maxPoints = 0;
    let testPoints = 0;
    let testMax = 0;
    const results: { exerciseId: string; isCorrect: boolean; pointsAwarded: number; correction: unknown }[] = [];

    for (const a of parsed.data.answers) {
      const ex = exMap.get(a.exerciseId);
      if (!ex) continue;
      const meta = (ex.metadata ?? {}) as Record<string, unknown>;
      const options = Array.isArray(meta.options)
        ? (meta.options as { id: string; isCorrect?: boolean }[]).map((o) => ({ id: o.id, isCorrect: o.isCorrect === true }))
        : [];
      const gradable: GradableQuestion = {
        id: ex.id,
        taskFormat: ex.taskFormat,
        points: ex.points,
        metadata: ex.metadata,
        options,
      };
      let grade;
      try {
        grade = gradeAnswer(gradable, a.response);
      } catch {
        return Response.json(
          { error: { code: "BAD_RESPONSE", message: `Réponse malformée pour l'exercice ${ex.id}` } },
          { status: 400 }
        );
      }
      points += grade.pointsAwarded;
      maxPoints += ex.points;
      if (ex.isChapterTest) {
        testPoints += grade.pointsAwarded;
        testMax += ex.points;
      }
      results.push({
        exerciseId: ex.id,
        isCorrect: grade.isCorrect,
        pointsAwarded: grade.pointsAwarded,
        correction: { metadata: ex.metadata },
      });
    }

    const pctTotal = maxPoints > 0 ? Math.round((points / maxPoints) * 1000) / 10 : 0;
    const pctTest = testMax > 0 ? Math.round((testPoints / testMax) * 1000) / 10 : pctTotal;
    const completed = pctTest >= CHAPTER_PASS_THRESHOLD;

    const existing = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    });
    const bestScore = Math.max(existing?.bestScore ?? 0, pctTest);
    await db.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      update: {
        bestScore,
        ...(completed ? { status: "COMPLETED", completedAt: existing?.completedAt ?? new Date() } : {}),
      },
      create: {
        userId: user.id,
        lessonId: lesson.id,
        status: completed ? "COMPLETED" : "IN_PROGRESS",
        bestScore,
        completedAt: completed ? new Date() : null,
      },
    });

    // Le bloc d'exercices a été fait : l'activité est acquise, que le score
    // suffise ou non. Refaire lire toute la leçon après un simple échec au
    // quiz serait une double peine.
    await db.progressionActivite.upsert({
      where: {
        userId_lessonId_activite: {
          userId: user.id,
          lessonId: lesson.id,
          activite: "EXERCICES",
        },
      },
      update: {},
      create: { userId: user.id, lessonId: lesson.id, activite: "EXERCICES" },
    });

    const prochaineTentativeLe = completed ? null : prochaineTentativeApresEchec(maintenant);
    // Échec : on pose l'échéance de révision. Réussite : on la lève, sinon un
    // délai pose lors d'une tentative precedente survivrait a la reussite.
    await db.lessonProgress.update({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      data: {
        prochaineTentativeLe,
      },
    });

    return Response.json({
      ok: true,
      score: {
        pctTotal,
        pctTest,
        threshold: CHAPTER_PASS_THRESHOLD,
        chapterValidated: completed,
        // L'echeance voyage avec le score : sans elle le client ne peut que
        // dire « Reessayez », alors que la regle vient d'interdire l'essai.
        prochaineTentativeLe: prochaineTentativeLe?.toISOString() ?? null,
      },
      results,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
