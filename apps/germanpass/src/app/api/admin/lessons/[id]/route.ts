import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const exerciseSchema = z.object({
  taskFormat: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "MATCHING", "GAP_FILL", "ORDERING"]),
  prompt: z.string().min(3),
  metadata: z.record(z.unknown()),
  points: z.coerce.number().positive().default(1),
  isChapterTest: z.boolean().default(false),
  position: z.coerce.number().int().min(0).default(0),
});

// Tous les champs sont optionnels : on n'écrase que ce qui est fourni.
// `exercises` (s'il est présent) remplace l'intégralité du jeu d'exercices.
const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  contentMd: z.string().min(10).optional(),
  helpFr: z.string().max(20_000).nullable().optional(),
  helpEn: z.string().max(20_000).nullable().optional(),
  position: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  exercises: z.array(exerciseSchema).optional(),
});

/** Détail d'une leçon (avec ses exercices) pour l'édition admin. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const lesson = await db.lesson.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, level: true, kind: true } },
        exercises: { orderBy: { position: "asc" } },
      },
    });
    if (!lesson) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return Response.json({ lesson });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/**
 * Édition d'une leçon — utilisable AVANT (brouillon issu de l'IA) comme APRÈS
 * publication (mise à jour du contenu pédagogique). Le remplacement des
 * exercices se fait de façon atomique dans une transaction.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.lesson.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { exercises, ...fields } = parsed.data;

    const lesson = await db.$transaction(async (tx) => {
      if (exercises) {
        await tx.lessonExercise.deleteMany({ where: { lessonId: id } });
        if (exercises.length > 0) {
          await tx.lessonExercise.createMany({
            data: exercises.map((ex) => ({ ...ex, lessonId: id, metadata: ex.metadata as never })),
          });
        }
      }
      return tx.lesson.update({ where: { id }, data: fields });
    });

    // Publier depuis l'éditeur vaut validation : on marque la génération IA
    // correspondante comme APPROVED (sinon elle resterait « À valider »).
    if (fields.status === "PUBLISHED") {
      await db.aiGeneration.updateMany({
        where: { targetType: "lesson", resultId: id, status: "PENDING_REVIEW" },
        data: { status: "APPROVED" },
      });
    }

    await audit({
      actorId: admin.id,
      action: "lesson.update",
      targetType: "Lesson",
      targetId: id,
      metadata: { fields: Object.keys(fields), exercisesReplaced: Boolean(exercises) },
    });
    return Response.json({ lesson });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Suppression d'une leçon (cascade : exercices + progressions associées). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.lesson.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    await db.lesson.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "lesson.delete", targetType: "Lesson", targetId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
