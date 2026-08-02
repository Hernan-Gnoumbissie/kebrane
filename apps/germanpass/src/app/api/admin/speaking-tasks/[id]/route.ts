import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

// Champs optionnels : on n'écrase que ce qui est fourni.
const updateSchema = z.object({
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  partNumber: z.coerce.number().int().positive().optional(),
  taskFormat: z.enum(["PICTURE_DESCRIPTION", "PRESENTATION", "DIALOGUE_ROLEPLAY", "PLANNING_TASK"]).optional(),
  title: z.string().min(3).max(200).optional(),
  instructions: z.string().min(10).optional(),
  prepTimeSec: z.coerce.number().int().min(0).optional(),
  speakTimeSec: z.coerce.number().int().positive().optional(),
  stimulusImagePath: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

/** Détail d'une tâche Sprechen pour l'édition admin. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const task = await db.speakingTask.findUnique({ where: { id } });
    if (!task) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return Response.json({ task });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Édition d'une tâche Sprechen (avant ou après publication). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.speakingTask.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const fields = parsed.data;

    const task = await db.speakingTask.update({
      where: { id },
      data: {
        ...fields,
        ...(fields.status ? { archived: fields.status === "ARCHIVED" } : {}),
      },
    });

    await audit({
      actorId: admin.id,
      action: "speaking_task.update",
      targetType: "SpeakingTask",
      targetId: id,
      metadata: { fields: Object.keys(fields) },
    });
    return Response.json({ task });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Suppression d'une tâche Sprechen. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.speakingTask.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    await db.speakingTask.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "speaking_task.delete", targetType: "SpeakingTask", targetId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
