import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

// Champs optionnels : on n'écrase que ce qui est fourni.
const updateSchema = z.object({
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  taskNumber: z.coerce.number().int().positive().optional(),
  taskFormat: z.enum(["LETTER_FORMAL", "LETTER_INFORMAL", "ESSAY", "FORUM_POST"]).optional(),
  title: z.string().min(3).max(200).optional(),
  instructions: z.string().min(10).optional(),
  minWords: z.coerce.number().int().positive().nullable().optional(),
  maxWords: z.coerce.number().int().positive().nullable().optional(),
  timeLimitMin: z.coerce.number().int().positive().optional(),
  criteria: z
    .array(
      z.object({
        key: z.string().min(1),
        labelDe: z.string().min(1),
        labelFr: z.string().optional(),
        maxPoints: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .min(1)
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

/** Détail d'une consigne Schreiben pour l'édition admin. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const prompt = await db.writingPrompt.findUnique({ where: { id } });
    if (!prompt) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return Response.json({ prompt });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Édition d'une consigne Schreiben (avant ou après publication). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.writingPrompt.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { criteria, ...fields } = parsed.data;

    const prompt = await db.writingPrompt.update({
      where: { id },
      data: {
        ...fields,
        ...(criteria ? { criteria: criteria as never } : {}),
        ...(fields.status ? { archived: fields.status === "ARCHIVED" } : {}),
      },
    });

    await audit({
      actorId: admin.id,
      action: "writing_prompt.update",
      targetType: "WritingPrompt",
      targetId: id,
      metadata: { fields: Object.keys(fields), criteriaReplaced: Boolean(criteria) },
    });
    return Response.json({ prompt });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Suppression d'une consigne Schreiben. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.writingPrompt.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    await db.writingPrompt.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "writing_prompt.delete", targetType: "WritingPrompt", targetId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
