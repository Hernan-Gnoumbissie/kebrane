import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { parseStructure } from "@/lib/exam-runner";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  blueprintId: z.string().min(1),
  title: z.string().min(3).max(200),
  /** auto : sélection automatique de contenu publié conforme au blueprint */
  mode: z.enum(["auto"]).default("auto"),
});

/**
 * Assemble un examen blanc depuis un blueprint (mode auto) :
 * - LESEN/HOEREN : passages publiés du provider/niveau avec leurs questions (par taskFormat)
 * - SCHREIBEN : WritingPrompts publiés (par taskNumber)
 * - SPRECHEN : SpeakingTasks publiées (par partNumber)
 * Échoue en listant les manques si la banque est insuffisante.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const blueprint = await db.examBlueprint.findUnique({ where: { id: parsed.data.blueprintId } });
    if (!blueprint || !blueprint.active) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Blueprint introuvable" } }, { status: 404 });
    }
    const structure = parseStructure(blueprint);
    const missing: string[] = [];

    type ItemRef = { questionId?: string; writingPromptId?: string; speakingTaskId?: string; partNumber: number };
    const sectionsToCreate: { section: string; durationMin: number; position: number; items: ItemRef[] }[] = [];

    for (let si = 0; si < structure.sections.length; si += 1) {
      const s = structure.sections[si];
      if (!s) continue;
      const items: ItemRef[] = [];

      for (const part of s.parts) {
        if (s.section === "LESEN" || s.section === "HOEREN") {
          const passage = await db.passage.findFirst({
            where: {
              section: s.section,
              level: blueprint.level,
              taskFormat: part.taskFormat as never,
              status: "PUBLISHED",
              archived: false,
              providers: { some: { provider: blueprint.provider } },
              ...(s.section === "HOEREN" ? { audioPath: { not: null } } : {}),
            },
            include: {
              questions: {
                where: { status: "PUBLISHED" },
                orderBy: { position: "asc" },
                take: part.itemCount,
              },
            },
            orderBy: { createdAt: "desc" },
          });
          if (!passage || passage.questions.length < part.itemCount) {
            missing.push(
              `${s.section} partie ${part.partNumber} : passage ${part.taskFormat} ${blueprint.level} avec ≥${part.itemCount} questions${s.section === "HOEREN" ? " + audio" : ""}`
            );
            continue;
          }
          for (const q of passage.questions) items.push({ questionId: q.id, partNumber: part.partNumber });
        } else if (s.section === "SCHREIBEN") {
          const prompt = await db.writingPrompt.findFirst({
            where: {
              provider: blueprint.provider,
              level: blueprint.level,
              taskNumber: part.partNumber,
              status: "PUBLISHED",
              archived: false,
            },
          });
          if (!prompt) {
            missing.push(`SCHREIBEN tâche ${part.partNumber} : consigne ${blueprint.provider} ${blueprint.level}`);
            continue;
          }
          items.push({ writingPromptId: prompt.id, partNumber: part.partNumber });
        } else {
          const task = await db.speakingTask.findFirst({
            where: {
              provider: blueprint.provider,
              level: blueprint.level,
              partNumber: part.partNumber,
              status: "PUBLISHED",
              archived: false,
            },
          });
          if (!task) {
            missing.push(`SPRECHEN partie ${part.partNumber} : tâche ${blueprint.provider} ${blueprint.level}`);
            continue;
          }
          items.push({ speakingTaskId: task.id, partNumber: part.partNumber });
        }
      }
      sectionsToCreate.push({ section: s.section, durationMin: s.durationMin, position: si, items });
    }

    if (missing.length > 0) {
      return Response.json(
        { error: { code: "INSUFFICIENT_CONTENT", message: "Banque de contenu insuffisante", missing } },
        { status: 422 }
      );
    }

    const mockExam = await db.mockExam.create({
      data: {
        blueprintId: blueprint.id,
        title: parsed.data.title,
        sections: {
          create: sectionsToCreate.map((s) => ({
            section: s.section as never,
            durationMin: s.durationMin,
            position: s.position,
            items: {
              create: s.items.map((item, i) => ({
                questionId: item.questionId,
                writingPromptId: item.writingPromptId,
                speakingTaskId: item.speakingTaskId,
                partNumber: item.partNumber,
                position: i,
              })),
            },
          })),
        },
      },
    });
    await audit({ actorId: admin.id, action: "mock_exam.create", targetType: "MockExam", targetId: mockExam.id });
    return Response.json({ mockExam }, { status: 201 });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const exams = await db.mockExam.findMany({
      orderBy: { createdAt: "desc" },
      include: { blueprint: { select: { provider: true, level: true, title: true } } },
    });
    return Response.json({ exams });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
