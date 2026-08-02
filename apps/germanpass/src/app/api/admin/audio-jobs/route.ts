import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { enqueue } from "@/lib/queue";
import { audit } from "@/lib/audit";

const schema = z.object({
  targetType: z.enum(["passage", "lesson", "flashcard"]),
  targetId: z.string().min(1),
  voice: z.string().default("auto"),
  variety: z.enum(["DE", "AT", "CH"]).default("DE"),
  speed: z.coerce.number().min(0.5).max(1.5).optional(),
});

/** Lance (ou relance) une génération TTS pour un passage Hören, une leçon ou une flashcard. */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { targetType, targetId, voice, variety } = parsed.data;

    let speed = parsed.data.speed;
    let passageId: string | null = null;
    if (targetType === "passage") {
      const passage = await db.passage.findUnique({ where: { id: targetId } });
      if (!passage) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
      passageId = passage.id;
      if (!speed) {
        const { speedForLevel } = await import("@/worker/jobs/tts");
        speed = speedForLevel(passage.level);
      }
    }

    const job = await db.audioJob.create({
      data: {
        targetType,
        targetId: targetType === "passage" ? null : targetId,
        passageId,
        voice,
        variety,
        speed: speed ?? 1.0,
      },
    });
    await enqueue({ type: "tts", audioJobId: job.id });
    await audit({ actorId: admin.id, action: "tts.enqueue", targetType: "AudioJob", targetId: job.id });
    return Response.json({ ok: true, jobId: job.id }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const jobs = await db.audioJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return Response.json({ jobs });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
