import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { evaluateWriting, countWords } from "@/lib/writing-eval";
import { AiBudgetExceededError } from "@/lib/ai";
import { LEVEL_ORDER } from "@/lib/level-progression";

const schema = z.object({
  writingPromptId: z.string().min(1),
  text: z.string().min(20).max(20000),
  attemptId: z.string().optional(),
});

/** Soumission Schreiben → évaluation IA par critères provider. */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    const rl = await rateLimit(`writing:${user.id}`, 10, 3600);
    if (!rl.allowed) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Trop de soumissions, réessayez plus tard" } },
        { status: 429 }
      );
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    const prompt = await db.writingPrompt.findFirst({
      where: { id: parsed.data.writingPromptId, status: "PUBLISHED" },
    });
    if (!prompt) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Consigne introuvable" } }, { status: 404 });
    }

    // Garde : niveau verrouillé
    if (LEVEL_ORDER.indexOf(prompt.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    const submission = await db.writingSubmission.create({
      data: {
        userId: user.id,
        writingPromptId: prompt.id,
        attemptId: parsed.data.attemptId ?? null,
        text: parsed.data.text,
        wordCount: countWords(parsed.data.text),
        status: "EVALUATING",
      },
    });

    try {
      const nativeLang = user.localePref === "en" ? ("en" as const) : ("fr" as const);
      const feedback = await evaluateWriting({ userId: user.id, prompt, text: parsed.data.text, nativeLang });
      const updated = await db.writingSubmission.update({
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
      });
      return Response.json({ submission: updated }, { status: 201 });
    } catch (e) {
      const msg =
        e instanceof AiBudgetExceededError
          ? "Plafond IA mensuel atteint — réessayez le mois prochain ou contactez l'administrateur"
          : "Évaluation indisponible, réessayez plus tard";
      await db.writingSubmission.update({
        where: { id: submission.id },
        data: { status: "FAILED", error: e instanceof Error ? e.message : "unknown" },
      });
      return Response.json({ error: { code: "EVAL_FAILED", message: msg } }, { status: 502 });
    }
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Historique de mes productions écrites. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireStudent();
    const submissions = await db.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        wordCount: true,
        scores: true,
        createdAt: true,
        writingPrompt: { select: { title: true, provider: true, level: true } },
      },
    });
    return Response.json({ submissions });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
