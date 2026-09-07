import { db } from "@/lib/db";
import { requireFullPlan, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";
import {
  ETAT_VIERGE,
  chapitreFranchi,
  exercicesAccessibles,
  leconDeverrouillee,
  leconEstComplete,
  minutesAvantNouvelleTentative,
  progressionChapitre,
  type ActiviteLecon,
  type EtatLecon,
  type Lecon,
} from "@/lib/progression-curriculum";

/**
 * Cours par niveau, avec l'état de déblocage de chaque leçon (UX-08).
 *
 * Les niveaux déjà atteints RESTENT accessibles — décision PO : certaines
 * leçons A2 demandent un retour sur du A1.
 *
 * Le verrouillage est calculé ICI, côté serveur. Le laisser au client
 * reviendrait à publier la liste complète et à compter sur l'interface pour la
 * cacher : le contenu partirait quand même sur le réseau.
 */
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
        level: level ? (level as never) : { in: allowedLevels },
        ...(kind ? { kind: kind as never } : {}),
      },
      orderBy: [{ level: "asc" }, { position: "asc" }],
      include: {
        lessons: {
          where: { status: "PUBLISHED" },
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            position: true,
            audioPath: true,
            estTestChapitre: true,
          },
        },
      },
    });

    const [progress, activites] = await Promise.all([
      db.lessonProgress.findMany({
        where: { userId: user.id },
        select: { lessonId: true, status: true, bestScore: true, prochaineTentativeLe: true },
      }),
      db.progressionActivite.findMany({
        where: { userId: user.id },
        select: { lessonId: true, activite: true },
      }),
    ]);

    const progressMap = new Map(progress.map((p) => [p.lessonId, p]));
    const activitesParLecon = new Map<string, ActiviteLecon[]>();
    for (const a of activites) {
      const liste = activitesParLecon.get(a.lessonId) ?? [];
      liste.push(a.activite as ActiviteLecon);
      activitesParLecon.set(a.lessonId, liste);
    }

    const maintenant = new Date();

    return Response.json({
      courses: courses.map((c) => {
        // Forme attendue par les règles pures : ce qu'une leçon EXIGE, pas ce
        // qu'elle contient.
        const lecons: Lecon[] = c.lessons.map((l) => ({
          id: l.id,
          aAudio: Boolean(l.audioPath),
          estTestChapitre: l.estTestChapitre,
        }));

        const etats = new Map<string, EtatLecon>(
          c.lessons.map((l) => {
            const p = progressMap.get(l.id);
            return [
              l.id,
              {
                activitesTerminees: activitesParLecon.get(l.id) ?? [],
                meilleurScore: p?.bestScore ?? null,
                prochaineTentativeLe: p?.prochaineTentativeLe ?? null,
              },
            ];
          })
        );

        return {
          id: c.id,
          level: c.level,
          kind: c.kind,
          title: c.title,
          description: c.description,
          progression: progressionChapitre(lecons, etats),
          franchi: chapitreFranchi(lecons, etats),
          lessons: c.lessons.map((l, index) => {
            const lecon = lecons[index] as Lecon;
            const etat = etats.get(l.id) ?? ETAT_VIERGE;
            return {
              id: l.id,
              title: l.title,
              position: l.position,
              estTestChapitre: l.estTestChapitre,
              progress: progressMap.get(l.id) ?? { status: "NOT_STARTED", bestScore: null },
              deverrouillee: leconDeverrouillee(index, lecons, etats),
              complete: leconEstComplete(lecon, etat),
              exercicesAccessibles: exercicesAccessibles(lecon, etat),
              activitesTerminees: etat.activitesTerminees,
              // On annonce le temps restant plutôt que de refuser sans rien dire.
              minutesAvantNouvelleTentative: minutesAvantNouvelleTentative(etat, maintenant),
            };
          }),
        };
      }),
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
