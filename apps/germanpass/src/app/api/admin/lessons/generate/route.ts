import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { generateLesson } from "@/lib/generation";

const schema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(3).max(200),
  lernziel: z.string().min(5).max(500),
  exerciseCount: z.coerce.number().int().min(3).max(10).default(5),
});

/** Génération IA d'une leçon complète à partir du titre + Lernziel — validation humaine ensuite. */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const rl = await rateLimit(`gen:${admin.id}`, 20, 3600);
    if (!rl.allowed) {
      return Response.json({ error: { code: "RATE_LIMITED", message: "Trop de générations" } }, { status: 429 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const course = await db.course.findUnique({ where: { id: parsed.data.courseId } });
    if (!course) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Chapitre introuvable" } }, { status: 404 });
    }
    const generationId = await generateLesson({ adminId: admin.id, ...parsed.data });
    const generation = await db.aiGeneration.findUnique({ where: { id: generationId } });
    return Response.json({ generation }, { status: 201 });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    // Ne pas exposer les détails internes (URL IA, stack trace…) au client
    return Response.json(
      { error: { code: "GENERATION_FAILED", message: "Génération échouée — réessayez ou vérifiez la configuration IA." } },
      { status: 502 }
    );
  }
}
