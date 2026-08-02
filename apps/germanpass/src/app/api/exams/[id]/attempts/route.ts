import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { parseStructure, sectionDuration, startSection } from "@/lib/exam-runner";
import { audit } from "@/lib/audit";

/** Démarre un examen blanc : crée l'attempt et ouvre la première section. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;

    const exam = await db.mockExam.findFirst({
      where: { id, isPublished: true },
      include: { blueprint: true },
    });
    if (!exam) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Examen introuvable" } }, { status: 404 });
    }

    const inProgress = await db.attempt.findFirst({
      where: { userId: user.id, kind: "MOCK", status: "IN_PROGRESS" },
    });
    if (inProgress) {
      return Response.json(
        { error: { code: "ALREADY_IN_PROGRESS", message: "Un examen est déjà en cours" }, attemptId: inProgress.id },
        { status: 409 }
      );
    }

    const structure = parseStructure(exam.blueprint);
    const first = structure.sections[0];
    if (!first) {
      return Response.json({ error: { code: "BAD_BLUEPRINT" } }, { status: 500 });
    }

    const attempt = await db.attempt.create({
      data: {
        userId: user.id,
        kind: "MOCK",
        blueprintId: exam.blueprintId,
        mockExamId: exam.id,
        status: "IN_PROGRESS",
      },
    });
    const deadline = await startSection(attempt.id, first.section, sectionDuration(structure, first.section));
    await audit({ actorId: user.id, action: "mock.start", targetType: "Attempt", targetId: attempt.id });

    return Response.json(
      { attemptId: attempt.id, currentSection: first.section, deadline: deadline.toISOString() },
      { status: 201 }
    );
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
