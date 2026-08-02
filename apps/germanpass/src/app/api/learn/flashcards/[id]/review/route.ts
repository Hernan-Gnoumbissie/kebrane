import { z } from "zod";
import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { sm2 } from "@/lib/srs";

const schema = z.object({ quality: z.number().int().min(0).max(5) });

/** Enregistre une révision SM-2 et calcule la prochaine échéance. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", message: "quality 0-5 requis" } }, { status: 400 });
    }

    const card = await db.flashcard.findUnique({ where: { id } });
    if (!card) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const existing = await db.flashcardReview.findUnique({
      where: { userId_flashcardId: { userId: user.id, flashcardId: id } },
    });
    const next = sm2(
      {
        easeFactor: existing?.easeFactor ?? 2.5,
        intervalDays: existing?.intervalDays ?? 0,
        repetitions: existing?.repetitions ?? 0,
      },
      parsed.data.quality
    );

    await db.flashcardReview.upsert({
      where: { userId_flashcardId: { userId: user.id, flashcardId: id } },
      update: { ...next, lastQuality: parsed.data.quality },
      create: { userId: user.id, flashcardId: id, ...next, lastQuality: parsed.data.quality },
    });

    return Response.json({ ok: true, nextDueAt: next.dueAt.toISOString(), intervalDays: next.intervalDays });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
