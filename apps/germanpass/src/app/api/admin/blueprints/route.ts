import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";

/** Liste des blueprints actifs (pour l'assemblage d'examens blancs). */
export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const blueprints = await db.examBlueprint.findMany({
      where: { active: true },
      orderBy: [{ provider: "asc" }, { level: "asc" }],
      select: { id: true, provider: true, level: true, title: true },
    });
    return Response.json({ blueprints });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
