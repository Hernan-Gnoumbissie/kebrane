import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";

/** Tire une consigne Schreiben publiée selon provider/niveau (sans les critères détaillés). */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") ?? "GOETHE";
    const level = url.searchParams.get("level") ?? "B1";

    // Garde : niveau verrouillé
    if (LEVEL_ORDER.indexOf(level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    const where = {
      provider: provider as never,
      level: level as never,
      status: "PUBLISHED" as const,
      archived: false,
    };
    const count = await db.writingPrompt.count({ where });
    if (count === 0) {
      return Response.json({ error: { code: "NO_CONTENT", message: "Aucune consigne disponible" } }, { status: 404 });
    }
    const prompt = await db.writingPrompt.findFirst({
      where,
      skip: Math.floor(Math.random() * count),
      select: {
        id: true,
        provider: true,
        level: true,
        taskNumber: true,
        taskFormat: true,
        title: true,
        instructions: true,
        minWords: true,
        maxWords: true,
        timeLimitMin: true,
      },
    });
    return Response.json({ prompt });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
