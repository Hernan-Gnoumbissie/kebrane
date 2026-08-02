import { z } from "zod";
import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { gradeAnswer, type GradableQuestion } from "@/lib/correction";
import { LEVEL_ORDER } from "@/lib/level-progression";

const CHAPTER_PASS_THRESHOLD = 70;

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

    // Garde : niveau du cours verrouillé
    if (LEVEL_ORDER.indexOf(lesson.course.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
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

    return Response.json({
      ok: true,
      score: { pctTotal, pctTest, threshold: CHAPTER_PASS_THRESHOLD, chapterValidated: completed },
      results,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
