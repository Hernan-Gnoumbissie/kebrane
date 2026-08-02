import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";

/** Décompte serveur des écoutes (Hören). Refuse au-delà de maxListens. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;

    const attempt = await db.attempt.findFirst({
      where: { id, userId: user.id, status: "IN_PROGRESS" },
      include: { passage: true },
    });
    if (!attempt || !attempt.passage) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Session introuvable" } }, { status: 404 });
    }

    const listens = await db.listenEvent.count({
      where: { attemptId: attempt.id, passageId: attempt.passage.id },
    });
    if (listens >= attempt.passage.maxListens) {
      return Response.json(
        { error: { code: "MAX_LISTENS", message: "Nombre d'écoutes maximal atteint" }, remaining: 0 },
        { status: 403 }
      );
    }

    await db.listenEvent.create({ data: { attemptId: attempt.id, passageId: attempt.passage.id } });
    return Response.json({ ok: true, remaining: attempt.passage.maxListens - listens - 1 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
