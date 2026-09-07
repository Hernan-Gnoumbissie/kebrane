import { z } from "zod";
import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";

const schema = z.object({
  activite: z.enum(["CONTENU", "AUDIO"]),
});

/**
 * Marque une activité de leçon comme terminée (UX-08).
 *
 * C'est l'équivalent du bouton « Erledigt » de Moodle : l'apprenant DÉCLARE
 * avoir lu la leçon ou écouté l'audio. On ne le déduit pas de l'ouverture de la
 * page — ouvrir n'est pas lire, et compter une leçon comme suivie parce qu'elle
 * a été affichée une seconde viderait la règle de son sens.
 *
 * `EXERCICES` n'est pas acceptée ici : cette activité est posée par la
 * soumission des réponses, qui seule prouve qu'ils ont été faits. La laisser
 * déclarable ouvrirait un contournement du seuil de 70 %.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await requireFullPlan();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });
    }

    const lesson = await db.lesson.findFirst({
      where: { id, status: "PUBLISHED" },
      select: { id: true, audioPath: true, course: { select: { level: true } } },
    });
    if (!lesson) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    if (LEVEL_ORDER.indexOf(lesson.course.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    // On refuse de marquer un audio écouté sur une leçon qui n'en a pas : sans
    // ce contrôle, une leçon sans audio pourrait être « complétée » par une
    // activité qu'elle n'exige pas.
    if (parsed.data.activite === "AUDIO" && !lesson.audioPath) {
      return Response.json(
        { error: { code: "SANS_AUDIO", message: "Cette leçon n'a pas d'audio." } },
        { status: 400 }
      );
    }

    await db.progressionActivite.upsert({
      where: {
        userId_lessonId_activite: {
          userId: user.id,
          lessonId: lesson.id,
          activite: parsed.data.activite,
        },
      },
      update: {},
      create: { userId: user.id, lessonId: lesson.id, activite: parsed.data.activite },
    });

    const terminees = await db.progressionActivite.findMany({
      where: { userId: user.id, lessonId: lesson.id },
      select: { activite: true },
    });

    return Response.json({ ok: true, activitesTerminees: terminees.map((t) => t.activite) });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
