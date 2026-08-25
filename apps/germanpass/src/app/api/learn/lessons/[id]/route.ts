import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";
import {
  activitesAttendues,
  exercicesAccessibles,
  type ActiviteLecon,
  type EtatLecon,
  type Lecon,
} from "@/lib/progression-curriculum";

/** Contenu d'une leçon + exercices SANITISÉS (aucune clé de correction). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const { id } = await ctx.params;
    const lesson = await db.lesson.findFirst({
      where: { id, status: "PUBLISHED" },
      include: { exercises: { orderBy: { position: "asc" } }, course: { select: { title: true, level: true, kind: true } } },
    });
    if (!lesson) {
      return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    }

    // Garde : niveau du cours verrouillé
    if (LEVEL_ORDER.indexOf(lesson.course.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    // Crée ou met à jour la progression, sans rétrograder un statut COMPLETED
    // (un candidat peut relire une leçon sans perdre son avancement).
    const existingProgress = await db.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
      select: { status: true },
    });
    if (!existingProgress) {
      await db.lessonProgress.create({
        data: { userId: user.id, lessonId: lesson.id, status: "IN_PROGRESS" },
      });
    } else if (existingProgress.status !== "COMPLETED") {
      await db.lessonProgress.update({
        where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
        data: { status: "IN_PROGRESS" },
      });
    }

    const exercises = lesson.exercises.map((ex) => {
      const meta = (ex.metadata ?? {}) as Record<string, unknown>;
      let clientMetadata: Record<string, unknown> | null = null;
      switch (ex.taskFormat) {
        case "MCQ_SINGLE":
        case "MCQ_MULTI": {
          const options = Array.isArray(meta.options)
            ? (meta.options as { id: string; text: string }[]).map((o) => ({ id: o.id, text: o.text }))
            : [];
          clientMetadata = { options };
          break;
        }
        case "TRUE_FALSE":
          clientMetadata = {};
          break;
        case "MATCHING": {
          const pairs = Array.isArray(meta.pairs)
            ? (meta.pairs as { leftId: string; left?: string; rightId: string; right?: string }[])
            : [];
          clientMetadata = {
            left: pairs.map((p) => ({ leftId: p.leftId, text: p.left ?? "" })),
            right: [...pairs]
              .sort(() => Math.random() - 0.5)
              .map((p) => ({ rightId: p.rightId, text: p.right ?? "" })),
          };
          break;
        }
        case "GAP_FILL": {
          const gaps = Array.isArray(meta.gaps) ? (meta.gaps as { gapId: string }[]) : [];
          clientMetadata = {
            textWithGaps: typeof meta.textWithGaps === "string" ? meta.textWithGaps : "",
            gapIds: gaps.map((g) => g.gapId),
          };
          break;
        }
        case "ORDERING": {
          const items = Array.isArray(meta.items) ? (meta.items as { itemId: string; text?: string }[]) : [];
          clientMetadata = {
            items: [...items].sort(() => Math.random() - 0.5).map((i) => ({ itemId: i.itemId, text: i.text ?? "" })),
          };
          break;
        }
      }
      return {
        id: ex.id,
        taskFormat: ex.taskFormat,
        prompt: ex.prompt,
        points: ex.points,
        isChapterTest: ex.isChapterTest,
        clientMetadata,
      };
    });

    // État des activités : le client en a besoin pour savoir s'il peut ouvrir
    // les exercices, et pour afficher ce qui reste à faire (UX-08).
    const activitesFaites = await db.progressionActivite.findMany({
      where: { userId: user.id, lessonId: lesson.id },
      select: { activite: true },
    });
    const lecon: Lecon = {
      id: lesson.id,
      aAudio: Boolean(lesson.audioPath),
      estTestChapitre: lesson.estTestChapitre,
    };
    const etat: EtatLecon = {
      activitesTerminees: activitesFaites.map((a) => a.activite as ActiviteLecon),
      meilleurScore: null,
      prochaineTentativeLe: null,
    };

    // Aide dans la langue native du candidat (repli sur l'autre langue si absente)
    const nativeLang = user.localePref === "en" ? "en" : "fr";
    const helpMd = nativeLang === "en" ? (lesson.helpEn ?? lesson.helpFr) : (lesson.helpFr ?? lesson.helpEn);

    return Response.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        contentMd: lesson.contentMd,
        helpMd,
        helpLang: nativeLang,
        audioUrl: lesson.audioPath ? `/api/files/${lesson.audioPath}` : null,
        course: lesson.course,
      },
      exercises,
      activitesTerminees: etat.activitesTerminees,
      activitesAttendues: activitesAttendues(lecon),
      exercicesAccessibles: exercicesAccessibles(lecon, etat),
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
