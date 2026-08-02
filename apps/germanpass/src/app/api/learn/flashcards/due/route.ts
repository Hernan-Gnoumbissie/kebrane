import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";

/** File de révision SRS : cartes dues + nouvelles cartes (max 20). */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const url = new URL(req.url);
    const level = url.searchParams.get("level");

    // Garde : niveau verrouillé (param explicite)
    if (level && LEVEL_ORDER.indexOf(level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    // Niveaux accessibles = tous les niveaux ≤ currentLevel
    const allowedLevels = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(user.currentLevel) + 1);
    const deckLevelFilter = level ? { level: level as never } : { level: { in: allowedLevels } };

    const due = await db.flashcardReview.findMany({
      where: {
        userId: user.id,
        dueAt: { lte: new Date() },
        flashcard: { deck: { archived: false, ...deckLevelFilter } },
      },
      orderBy: { dueAt: "asc" },
      take: 20,
      include: { flashcard: { include: { deck: true } } },
    });

    const reviewedIds = (
      await db.flashcardReview.findMany({ where: { userId: user.id }, select: { flashcardId: true } })
    ).map((r) => r.flashcardId);

    const fresh = await db.flashcard.findMany({
      where: {
        id: { notIn: reviewedIds },
        deck: { archived: false, ...deckLevelFilter },
      },
      orderBy: { position: "asc" },
      take: Math.max(0, 20 - due.length),
      include: { deck: true },
    });

    const toCard = (f: (typeof fresh)[number]) => ({
      id: f.id,
      front: f.front,
      back: f.back,
      article: f.article,
      plural: f.plural,
      exampleDe: f.exampleDe,
      exampleFr: f.exampleFr,
      audioUrl: f.audioPath ? `/api/files/${f.audioPath}` : null,
      deck: { theme: f.deck.theme, level: f.deck.level },
    });

    return Response.json({
      cards: [...due.map((d) => toCard(d.flashcard as never)), ...fresh.map(toCard)],
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
