import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { generatePassage } from "@/lib/generation";

const createSchema = z.object({
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  section: z.enum(["LESEN", "HOEREN"]),
  // MATCHING, GAP_FILL et ORDERING nécessitent une structure metadata spécifique
  // que le prompt IA actuel ne produit pas de façon fiable. Seuls MCQ et TRUE_FALSE
  // sont supportés en génération automatique ; les autres formats sont créés manuellement.
  taskFormat: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE"]),
  theme: z.string().min(3).max(200),
  itemCount: z.coerce.number().int().min(1).max(15),
});

/** Lance une génération IA (passage + questions) — validation humaine ensuite. */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const rl = await rateLimit(`gen:${admin.id}`, 20, 3600);
    if (!rl.allowed) {
      return Response.json({ error: { code: "RATE_LIMITED", message: "Trop de générations" } }, { status: 429 });
    }
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const generationId = await generatePassage({ adminId: admin.id, ...parsed.data });
    const generation = await db.aiGeneration.findUnique({ where: { id: generationId } });
    return Response.json({ generation }, { status: 201 });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json(
      { error: { code: "GENERATION_FAILED", message: e instanceof Error ? e.message : "Erreur" } },
      { status: 502 }
    );
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const generations = await db.aiGeneration.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Aperçu du contenu généré pour la revue humaine (passages + questions).
    const passageIds = generations
      .filter((g) => g.targetType === "passage" && g.resultId)
      .map((g) => g.resultId as string);
    const passages = passageIds.length
      ? await db.passage.findMany({
          where: { id: { in: passageIds } },
          select: {
            id: true,
            title: true,
            body: true,
            section: true,
            audioPath: true,
            questions: { orderBy: { position: "asc" }, select: { id: true, prompt: true } },
          },
        })
      : [];
    const byId = new Map(passages.map((p) => [p.id, p]));

    // Aperçu des leçons générées
    const lessonIds = generations
      .filter((g) => g.targetType === "lesson" && g.resultId)
      .map((g) => g.resultId as string);
    const lessons = lessonIds.length
      ? await db.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: {
            id: true,
            title: true,
            contentMd: true,
            course: { select: { title: true, level: true } },
            exercises: { orderBy: { position: "asc" }, select: { id: true, prompt: true } },
          },
        })
      : [];
    const lessonById = new Map(lessons.map((l) => [l.id, l]));

    const enriched = generations.map((g) => ({
      ...g,
      passage: g.targetType === "passage" && g.resultId ? (byId.get(g.resultId) ?? null) : null,
      lesson: g.targetType === "lesson" && g.resultId ? (lessonById.get(g.resultId) ?? null) : null,
    }));

    return Response.json({ generations: enriched });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
