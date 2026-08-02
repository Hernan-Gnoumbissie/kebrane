import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";

/** Cours (grammaire/vocabulaire/Redemittel) par niveau, avec ma progression. */
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const url = new URL(req.url);
    const level = url.searchParams.get("level");
    const kind = url.searchParams.get("kind");

    // Garde : niveau verrouillé (param explicite)
    if (level && LEVEL_ORDER.indexOf(level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    // Niveaux accessibles = tous les niveaux ≤ currentLevel
    const allowedLevels = LEVEL_ORDER.slice(0, LEVEL_ORDER.indexOf(user.currentLevel) + 1);

    const courses = await db.course.findMany({
      where: {
        archived: false,
        // Si level explicite : déjà validé ci-dessus ; sinon on cap à currentLevel
        level: level ? (level as never) : { in: allowedLevels },
        ...(kind ? { kind: kind as never } : {}),
      },
      orderBy: [{ level: "asc" }, { position: "asc" }],
      include: {
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: { position: "asc" },
          select: { id: true, title: true, position: true },
        },
      },
    });

    const progress = await db.lessonProgress.findMany({
      where: { userId: user.id },
      select: { lessonId: true, status: true, bestScore: true },
    });
    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));

    return Response.json({
      courses: courses.map((c) => ({
        id: c.id,
        level: c.level,
        kind: c.kind,
        title: c.title,
        description: c.description,
        lessons: c.lessons.map((l) => ({
          ...l,
          progress: progressMap.get(l.id) ?? { status: "NOT_STARTED", bestScore: null },
        })),
      })),
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
