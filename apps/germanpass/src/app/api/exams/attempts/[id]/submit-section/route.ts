import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { gradeAnswer, type GradableQuestion } from "@/lib/correction";
import {
  parseStructure,
  nextSection,
  sectionDuration,
  startSection,
  getDeadlines,
  isPastDeadline,
} from "@/lib/exam-runner";
import { evaluateWriting, countWords } from "@/lib/writing-eval";
import { audit } from "@/lib/audit";

const schema = z.object({
  answers: z.array(z.object({ questionId: z.string(), response: z.unknown() })).default([]),
  writings: z.array(z.object({ writingPromptId: z.string(), text: z.string().max(20000) })).default([]),
  /** true si le client soumet automatiquement à expiration */
  auto: z.boolean().default(false),
});

/**
 * Soumet la section courante (deadline serveur, tolérance +5 s), corrige les
 * réponses objectives, lance l'évaluation des écrits, puis ouvre la section
 * suivante — ou clôt l'examen. PAS DE RETOUR ARRIÈRE.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    const attempt = await db.attempt.findFirst({
      where: { id, userId: user.id, kind: "MOCK", status: "IN_PROGRESS" },
      include: {
        blueprint: true,
        mockExam: {
          include: {
            sections: { include: { items: { include: { question: { include: { options: true } } } } } },
          },
        },
      },
    });
    if (!attempt?.blueprint || !attempt.mockExam || !attempt.currentSection) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Examen en cours introuvable" } }, { status: 404 });
    }

    const current = attempt.currentSection;
    const deadline = getDeadlines(attempt)[current];
    const late = deadline ? isPastDeadline(deadline) : false;

    // Soumission tardive non-auto : refusée (le client doit auto-soumettre)
    if (late && !parsed.data.auto) {
      return Response.json(
        { error: { code: "DEADLINE_PASSED", message: "Temps écoulé — section soumise automatiquement" } },
        { status: 409 }
      );
    }

    // 1. Correction des réponses objectives (réponses tardives ignorées si late)
    if (!late && (current === "LESEN" || current === "HOEREN")) {
      const section = attempt.mockExam.sections.find((s) => s.section === current);
      const questionMap = new Map(
        (section?.items ?? []).filter((i) => i.question).map((i) => [i.question!.id, i.question!])
      );
      for (const answer of parsed.data.answers) {
        const q = questionMap.get(answer.questionId);
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
          continue; // réponse malformée → 0 point, on n'interrompt pas l'examen
        }
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
      }
    }

    // 2. Écrits : créés puis évalués (asynchrone du point de vue du rapport)
    if (!late && current === "SCHREIBEN") {
      for (const w of parsed.data.writings) {
        const prompt = await db.writingPrompt.findUnique({ where: { id: w.writingPromptId } });
        if (!prompt || w.text.trim().length < 10) continue;
        const submission = await db.writingSubmission.create({
          data: {
            userId: user.id,
            attemptId: attempt.id,
            writingPromptId: prompt.id,
            text: w.text,
            wordCount: countWords(w.text),
            status: "EVALUATING",
          },
        });
        // Évaluation immédiate (la section est terminée, la latence n'affecte pas le chrono)
        evaluateWriting({
          userId: user.id,
          prompt,
          text: w.text,
          nativeLang: user.localePref === "en" ? "en" : "fr",
        })
          .then((feedback) =>
            db.writingSubmission.update({
              where: { id: submission.id },
              data: {
                status: "COMPLETED",
                scores: {
                  perCriterion: feedback.perCriterion,
                  totalPoints: feedback.totalPoints,
                  maxPoints: feedback.maxPoints,
                  estimatedLevel: feedback.estimatedLevel,
                },
                feedback: {
                  lang: feedback.lang,
                  errors: feedback.errors,
                  recommendationsDe: feedback.recommendationsDe,
                  recommendationsNative: feedback.recommendationsNative,
                  summaryDe: feedback.summaryDe,
                  summaryNative: feedback.summaryNative,
                },
              },
            })
          )
          .catch((e) =>
            db.writingSubmission.update({
              where: { id: submission.id },
              data: { status: "FAILED", error: e instanceof Error ? e.message : "unknown" },
            })
          );
      }
    }
    // (SPRECHEN : les enregistrements arrivent via /api/speaking/submissions avec attemptId)

    // 3. Section suivante ou clôture
    const structure = parseStructure(attempt.blueprint);
    const next = nextSection(structure, current);
    if (next) {
      const nextDeadline = await startSection(attempt.id, next, sectionDuration(structure, next));
      return Response.json({ ok: true, nextSection: next, deadline: nextDeadline.toISOString() });
    }

    await db.attempt.update({
      where: { id: attempt.id },
      data: { status: "SUBMITTED", submittedAt: new Date(), currentSection: null },
    });
    await audit({ actorId: user.id, action: "mock.submit", targetType: "Attempt", targetId: attempt.id });
    return Response.json({ ok: true, finished: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
