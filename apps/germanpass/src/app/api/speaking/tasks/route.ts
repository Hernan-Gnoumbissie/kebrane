import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";

/** Tire une tâche Sprechen publiée selon provider/niveau. */
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
    const count = await db.speakingTask.count({ where });
    if (count === 0) {
      return Response.json({ error: { code: "NO_CONTENT", message: "Aucune tâche disponible" } }, { status: 404 });
    }
    const task = await db.speakingTask.findFirst({
      where,
      skip: Math.floor(Math.random() * count),
      select: {
        id: true,
        provider: true,
        level: true,
        partNumber: true,
        taskFormat: true,
        title: true,
        instructions: true,
        prepTimeSec: true,
        speakTimeSec: true,
        stimulusImagePath: true,
      },
    });
    return Response.json({
      task: task
        ? { ...task, stimulusImageUrl: task.stimulusImagePath ? `/api/files/${task.stimulusImagePath}` : null }
        : null,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
