import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const lessonSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(3).max(200),
  contentMd: z.string().min(10), // allemand niveaugerecht
  helpFr: z.string().optional(),
  helpEn: z.string().optional(),
  position: z.coerce.number().int().min(0).default(0),
  publish: z.boolean().default(false),
  exercises: z
    .array(
      z.object({
        taskFormat: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "MATCHING", "GAP_FILL", "ORDERING"]),
        prompt: z.string().min(3),
        metadata: z.record(z.unknown()),
        points: z.coerce.number().positive().default(1),
        isChapterTest: z.boolean().default(false),
        position: z.coerce.number().int().min(0).default(0),
      })
    )
    .default([]),
});

/** Création/édition de leçon (Markdown bilingue) avec exercices auto-corrigés. */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = lessonSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { exercises, publish, ...data } = parsed.data;
    const course = await db.course.findUnique({ where: { id: data.courseId } });
    if (!course) return Response.json({ error: { code: "NOT_FOUND", message: "Chapitre introuvable" } }, { status: 404 });

    const lesson = await db.lesson.create({
      data: {
        ...data,
        status: publish ? "PUBLISHED" : "DRAFT",
        exercises: {
          create: exercises.map((ex) => ({ ...ex, metadata: ex.metadata as never })),
        },
      },
    });
    await audit({ actorId: admin.id, action: "lesson.create", targetType: "Lesson", targetId: lesson.id });
    return Response.json({ lesson }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
