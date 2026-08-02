import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

/** Détail/polling d'une soumission Sprechen (propriétaire uniquement). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const submission = await db.speakingSubmission.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        status: true,
        transcript: true,
        scores: true,
        feedback: true,
        error: true,
        createdAt: true,
        audioPath: true,
        speakingTask: { select: { title: true, provider: true, level: true } },
      },
    });
    if (!submission) {
      return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }
    return Response.json({
      submission: { ...submission, audioUrl: `/api/files/${submission.audioPath}`, audioPath: undefined },
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

const flagSchema = z.object({ reason: z.string().min(5).max(500) });

/** Signalement d'une évaluation (file de modération admin). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const parsed = flagSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", message: "Motif requis (5-500 caractères)" } }, { status: 400 });
    }
    const submission = await db.speakingSubmission.findFirst({
      where: { id, userId: user.id, status: "COMPLETED" },
    });
    if (!submission) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Soumission introuvable ou non évaluée" } }, { status: 404 });
    }
    await db.speakingSubmission.update({
      where: { id },
      data: { status: "FLAGGED", flagReason: parsed.data.reason },
    });
    await audit({
      actorId: user.id,
      action: "speaking.flag",
      targetType: "SpeakingSubmission",
      targetId: id,
      metadata: { reason: parsed.data.reason },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
