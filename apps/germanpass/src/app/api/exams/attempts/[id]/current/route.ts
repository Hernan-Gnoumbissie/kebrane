import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { getDeadlines, isPastDeadline } from "@/lib/exam-runner";
import { sanitizeQuestion } from "@/lib/sanitize";

/**
 * Contenu de la section courante (sanitisé). Si la deadline est dépassée,
 * la section est marquée à auto-soumettre côté client (le serveur refuse
 * de toute façon les réponses tardives).
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireStudent();
    const { id } = await ctx.params;
    const attempt = await db.attempt.findFirst({
      where: { id, userId: user.id, kind: "MOCK", status: "IN_PROGRESS" },
      include: {
        mockExam: {
          include: {
            sections: {
              orderBy: { position: "asc" },
              include: {
                items: {
                  orderBy: { position: "asc" },
                  include: {
                    question: { include: { options: true, passage: true } },
                    writingPrompt: true,
                    speakingTask: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!attempt?.mockExam || !attempt.currentSection) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Examen en cours introuvable" } }, { status: 404 });
    }

    const section = attempt.mockExam.sections.find((s) => s.section === attempt.currentSection);
    if (!section) {
      return Response.json({ error: { code: "BAD_STATE" } }, { status: 500 });
    }
    const deadline = getDeadlines(attempt)[attempt.currentSection];
    const expired = deadline ? isPastDeadline(deadline) : false;

    // Regroupe les questions par passage (sans clés de correction)
    const passages = new Map<string, { id: string; title: string; body: string | null; audioUrl: string | null; maxListens: number; questions: unknown[] }>();
    const writingPrompts: unknown[] = [];
    const speakingTasks: unknown[] = [];

    for (const item of section.items) {
      if (item.question) {
        const p = item.question.passage;
        const key = p?.id ?? "_none";
        if (!passages.has(key)) {
          passages.set(key, {
            id: p?.id ?? "_none",
            title: p?.title ?? "",
            body: p && section.section === "LESEN" ? p.body : null,
            audioUrl: p?.audioPath ? `/api/files/${p.audioPath}` : null,
            maxListens: p?.maxListens ?? 1,
            questions: [],
          });
        }
        passages.get(key)?.questions.push(sanitizeQuestion(item.question));
      } else if (item.writingPrompt) {
        const wp = item.writingPrompt;
        writingPrompts.push({
          id: wp.id,
          taskNumber: wp.taskNumber,
          title: wp.title,
          instructions: wp.instructions,
          minWords: wp.minWords,
          maxWords: wp.maxWords,
        });
      } else if (item.speakingTask) {
        const st = item.speakingTask;
        speakingTasks.push({
          id: st.id,
          partNumber: st.partNumber,
          title: st.title,
          instructions: st.instructions,
          prepTimeSec: st.prepTimeSec,
          speakTimeSec: st.speakTimeSec,
          stimulusImageUrl: st.stimulusImagePath ? `/api/files/${st.stimulusImagePath}` : null,
        });
      }
    }

    return Response.json({
      attemptId: attempt.id,
      section: section.section,
      durationMin: section.durationMin,
      deadline,
      expired,
      passages: [...passages.values()],
      writingPrompts,
      speakingTasks,
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
