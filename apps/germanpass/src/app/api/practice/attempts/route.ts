import { z } from "zod";
import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { sanitizeQuestion } from "@/lib/sanitize";
import { LEVEL_ORDER } from "@/lib/level-progression";

const startSchema = z.object({
  section: z.enum(["LESEN", "HOEREN"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  provider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).optional(),
  passageId: z.string().optional(),
});

/** Démarre une session d'entraînement Lesen/Hören. */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    const parsed = startSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { section, level, provider, passageId } = parsed.data;

    // Garde : niveau verrouillé
    if (LEVEL_ORDER.indexOf(level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué. Atteins 70 % de score moyen sur 5 sessions au niveau actuel." } },
        { status: 403 }
      );
    }

    const where = {
      section,
      level,
      status: "PUBLISHED" as const,
      archived: false,
      ...(provider ? { providers: { some: { provider } } } : {}),
      ...(passageId ? { id: passageId } : {}),
    };

    // Sélection aléatoire en deux temps : d'abord les IDs disponibles, puis
    // le passage complet. Évite la race condition count → skip (un passage
    // pourrait être dépublié entre les deux requêtes avec l'ancienne approche).
    const ids = await db.passage.findMany({ where, select: { id: true } });
    if (ids.length === 0) {
      return Response.json(
        { error: { code: "NO_CONTENT", message: "Aucun contenu disponible pour ces critères" } },
        { status: 404 }
      );
    }
    const randomId = ids[Math.floor(Math.random() * ids.length)]!.id;
    const passage = await db.passage.findFirst({
      where: { id: randomId, ...where },
      include: { questions: { where: { status: "PUBLISHED" }, orderBy: { position: "asc" }, include: { options: true } } },
    });
    if (!passage || passage.questions.length === 0) {
      return Response.json({ error: { code: "NO_CONTENT", message: "Aucun contenu disponible" } }, { status: 404 });
    }

    const attempt = await db.attempt.create({
      data: { userId: user.id, kind: "PRACTICE", section, passageId: passage.id },
    });

    return Response.json(
      {
        attemptId: attempt.id,
        passage: {
          id: passage.id,
          title: passage.title,
          // Hören : le texte (script) n'est PAS envoyé, seulement l'audio
          body: section === "LESEN" ? passage.body : null,
          audioUrl: passage.audioPath ? `/api/files/${passage.audioPath}` : null,
          maxListens: passage.maxListens,
          variety: passage.variety,
        },
        questions: passage.questions.map(sanitizeQuestion),
      },
      { status: 201 }
    );
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Historique de mes sessions. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireStudent();
    const attempts = await db.attempt.findMany({
      where: { userId: user.id, kind: "PRACTICE" },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        section: true,
        status: true,
        scores: true,
        startedAt: true,
        submittedAt: true,
        passage: { select: { title: true, level: true } },
      },
    });
    return Response.json({ attempts });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
