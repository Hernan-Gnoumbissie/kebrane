/**
 * Catalogue des sujets d'entraînement, avec l'historique du candidat.
 *
 * L'entraînement tirait un sujet AU HASARD au clic sur « Démarrer ». Le
 * candidat ne savait donc ni ce qu'il allait travailler, ni s'il l'avait déjà
 * fait, ni comment il s'en était sorti la fois précédente. Impossible de
 * refaire un sujet raté, impossible de mesurer un progrès sur un même texte —
 * or c'est exactement ce que fait un candidat qui prépare un examen.
 *
 * Cette route rend le catalogue visible et y attache les essais passés.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { LEVEL_ORDER } from "@/lib/level-progression";
import { SITUATIONS } from "@/lib/hoeren/situations";

const schema = z.object({
  section: z.enum(["LESEN", "HOEREN"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).optional(),
});

/** Libellé lisible d'une situation Hören, depuis sa clé technique. */
const LIBELLE_SITUATION = new Map(SITUATIONS.map((s) => [s.cle, s.libelle]));

export async function GET(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    const url = new URL(req.url);
    const parsed = schema.safeParse({
      section: url.searchParams.get("section"),
      level: url.searchParams.get("level"),
      provider: url.searchParams.get("provider") ?? undefined,
    });
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const { section, level, provider } = parsed.data;

    // Même garde de niveau que le démarrage d'une session : sans elle, le
    // catalogue afficherait des sujets que la route de démarrage refuserait
    // ensuite. Montrer une porte fermée est pire que ne rien montrer.
    if (LEVEL_ORDER.indexOf(level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        {
          error: {
            code: "LEVEL_LOCKED",
            message: "Ce niveau n'est pas encore débloqué.",
          },
        },
        { status: 403 }
      );
    }

    const passages = await db.passage.findMany({
      where: {
        section,
        level,
        status: "PUBLISHED",
        archived: false,
        // Un Hören sans audio n'est pas un exercice : même règle qu'au
        // démarrage d'une session et qu'à l'assemblage d'un examen blanc.
        ...(section === "HOEREN" ? { audioPath: { not: null } } : {}),
        ...(provider ? { providers: { some: { provider } } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        taskFormat: true,
        situation: true,
        audioDurationSec: true,
        maxListens: true,
        speakers: true,
        _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
      },
    });

    // Historique du candidat sur ces sujets, en UNE requête plutôt qu'une par
    // sujet — le catalogue peut compter des dizaines d'entrées.
    const essais = passages.length
      ? await db.attempt.findMany({
          where: {
            userId: user.id,
            kind: "PRACTICE",
            status: "GRADED",
            passageId: { in: passages.map((p) => p.id) },
          },
          orderBy: { submittedAt: "asc" },
          select: { id: true, passageId: true, scores: true, submittedAt: true },
        })
      : [];

    const parPassage = new Map<string, { pct: number; date: string }[]>();
    for (const e of essais) {
      if (!e.passageId || !e.submittedAt) continue;
      const pct = (e.scores as { pct?: number } | null)?.pct;
      if (typeof pct !== "number") continue;
      const liste = parPassage.get(e.passageId) ?? [];
      liste.push({ pct: Math.round(pct * 10) / 10, date: e.submittedAt.toISOString() });
      parPassage.set(e.passageId, liste);
    }

    return Response.json({
      passages: passages.map((p) => {
        const historique = parPassage.get(p.id) ?? [];
        const scores = historique.map((h) => h.pct);
        const locuteurs = Array.isArray(p.speakers) ? p.speakers.length : null;
        return {
          id: p.id,
          title: p.title,
          taskFormat: p.taskFormat,
          // La situation est affichée en clair : « Eine Durchsage im Zug »
          // dit au candidat ce qu'il va écouter, pas « DURCHSAGE ».
          situation: p.situation ? (LIBELLE_SITUATION.get(p.situation) ?? p.situation) : null,
          questionCount: p._count.questions,
          dureeSecondes: p.audioDurationSec,
          maxListens: p.maxListens,
          locuteurs,
          essais: historique,
          meilleurScore: scores.length > 0 ? Math.max(...scores) : null,
        };
      }),
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
