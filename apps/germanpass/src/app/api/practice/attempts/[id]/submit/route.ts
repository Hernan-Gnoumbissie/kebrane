import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { gradeAnswer, type GradableQuestion } from "@/lib/correction";
import { checkAndUnlockNextLevel } from "@/lib/level-progression";
import { sendMail, mailTemplates } from "@/lib/mail";

const submitSchema = z.object({
  answers: z.array(z.object({ questionId: z.string(), response: z.unknown() })).min(1),
});

/** Soumission d'une session d'entraînement : correction serveur + explications. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const parsed = submitSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    const attempt = await db.attempt.findFirst({
      where: { id, userId: user.id, status: "IN_PROGRESS", kind: "PRACTICE" },
      include: { passage: { include: { questions: { where: { status: "PUBLISHED" }, include: { options: true } } } } },
    });
    if (!attempt || !attempt.passage) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Session introuvable ou déjà soumise" } }, { status: 404 });
    }

    const questions = new Map(attempt.passage.questions.map((q) => [q.id, q]));
    const results: {
      questionId: string;
      isCorrect: boolean;
      pointsAwarded: number;
      points: number;
      explanation: string | null;
      explanationFr: string | null;
      explanationEn: string | null;
      correction: unknown;
    }[] = [];

    let totalPoints = 0;
    let maxPoints = 0;

    for (const answer of parsed.data.answers) {
      const q = questions.get(answer.questionId);
      if (!q) continue;
      const gradable: GradableQuestion = {
        id: q.id,
        taskFormat: q.taskFormat,
        points: q.points,
        metadata: q.metadata,
        options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
      };
      let grade;
      try {
        grade = gradeAnswer(gradable, answer.response);
      } catch {
        return Response.json(
          { error: { code: "BAD_RESPONSE", message: `Réponse malformée pour la question ${q.id}` } },
          { status: 400 }
        );
      }
      totalPoints += grade.pointsAwarded;
      maxPoints += q.points;

      await db.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: q.id } },
        update: { response: answer.response as never, isCorrect: grade.isCorrect, pointsAwarded: grade.pointsAwarded, gradedAt: new Date() },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          response: answer.response as never,
          isCorrect: grade.isCorrect,
          pointsAwarded: grade.pointsAwarded,
          gradedAt: new Date(),
        },
      });

      // Après soumission seulement : clé de correction + explication
      results.push({
        questionId: q.id,
        isCorrect: grade.isCorrect,
        pointsAwarded: grade.pointsAwarded,
        points: q.points,
        explanation: q.explanation,
        explanationFr: q.explanationFr,
        explanationEn: q.explanationEn,
        correction: {
          correctOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
          metadata: q.metadata,
        },
      });
    }

    // Questions non répondues : 0 point mais comptées au max
    for (const q of attempt.passage.questions) {
      if (!parsed.data.answers.some((a) => a.questionId === q.id)) {
        maxPoints += q.points;
      }
    }

    const pctScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 1000) / 10 : 0;
    await db.attempt.update({
      where: { id: attempt.id },
      data: {
        status: "GRADED",
        submittedAt: new Date(),
        scores: { points: totalPoints, maxPoints, pct: pctScore },
      },
    });

    // ── Vérification du déblocage de niveau ──
    const unlockResult = await checkAndUnlockNextLevel(user.id, attempt.passage.level);

    if (unlockResult.unlocked) {
      // E-mail de félicitations (non bloquant)
      const tpl = mailTemplates.levelUnlocked(user.name, unlockResult.newLevel);
      void sendMail(user.email, tpl.subject, tpl.html).catch((err) =>
        console.error("[submit] email déblocage niveau non envoyé :", err)
      );
    }

    return Response.json({
      ok: true,
      score: { points: totalPoints, maxPoints, pct: pctScore },
      results,
      levelUnlocked: unlockResult,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
