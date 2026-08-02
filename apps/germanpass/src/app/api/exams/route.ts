import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";

/** Liste des examens blancs publiés. */
export async function GET(): Promise<Response> {
  try {
    await requireStudent();
    const exams = await db.mockExam.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        blueprint: { select: { provider: true, level: true, title: true, structure: true } },
      },
    });
    return Response.json({
      exams: exams.map((e) => ({
        id: e.id,
        title: e.title,
        provider: e.blueprint.provider,
        level: e.blueprint.level,
        blueprintTitle: e.blueprint.title,
        sections: (e.blueprint.structure as { sections?: { section: string; durationMin: number }[] }).sections?.map(
          (s) => ({ section: s.section, durationMin: s.durationMin })
        ),
      })),
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
