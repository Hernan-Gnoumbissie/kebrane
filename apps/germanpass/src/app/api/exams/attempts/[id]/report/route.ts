import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { computeMockReport } from "@/lib/exam-runner";

/**
 * Rapport final : score par section, verdict bestanden/nicht bestanden selon
 * les règles exactes du provider, comparaison aux tentatives précédentes.
 * Recalculé à chaque appel tant que des évaluations IA sont en cours.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const attempt = await db.attempt.findFirst({
      where: { id, userId: user.id, kind: "MOCK", status: { in: ["SUBMITTED", "GRADED"] } },
      include: { blueprint: true, mockExam: { select: { title: true } } },
    });
    if (!attempt?.blueprint) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Rapport indisponible" } }, { status: 404 });
    }

    const { result, pendingEvaluations } = await computeMockReport(attempt.id);

    if (!pendingEvaluations && attempt.status === "SUBMITTED") {
      await db.attempt.update({
        where: { id: attempt.id },
        data: { status: "GRADED", scores: result as never },
      });
    }

    // Comparaison aux tentatives précédentes sur le même blueprint
    const previous = await db.attempt.findMany({
      where: {
        userId: user.id,
        kind: "MOCK",
        blueprintId: attempt.blueprintId,
        status: "GRADED",
        id: { not: attempt.id },
      },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, submittedAt: true, scores: true },
    });

    return Response.json({
      examTitle: attempt.mockExam?.title,
      blueprint: {
        provider: attempt.blueprint.provider,
        level: attempt.blueprint.level,
        title: attempt.blueprint.title,
      },
      pendingEvaluations,
      result,
      previousAttempts: previous,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
