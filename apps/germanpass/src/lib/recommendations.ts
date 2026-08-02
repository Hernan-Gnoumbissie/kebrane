/**
 * Recommandations : analyse des erreurs récurrentes (feedbacks IA Schreiben/
 * Sprechen) → chapitres de grammaire suggérés. Heuristique par type d'erreur.
 */
import { db } from "@/lib/db";

/** Mots-clés de chapitre par type d'erreur dominant. */
const ERROR_TO_TOPICS: Record<string, string[]> = {
  Grammatik: ["Dativ", "Akkusativ", "Perfekt", "Konjunktiv", "Passiv", "Artikel", "Deklination"],
  Syntax: ["Satzbau", "Relativsätze", "Nebensätze", "Konnektoren"],
  Wortschatz: ["Wortschatz", "Redemittel"],
  Kohärenz: ["Konnektoren", "Redemittel"],
  Register: ["Redemittel", "Register"],
  Rechtschreibung: ["Rechtschreibung"],
};

export type Recommendation = {
  reason: string; // FR
  errorType: string;
  count: number;
  lessons: { id: string; title: string; courseTitle: string; level: string }[];
};

export async function getRecommendations(userId: string, limit = 3): Promise<Recommendation[]> {
  // 1. Compter les types d'erreurs des 20 derniers feedbacks
  const [writings, speakings] = await Promise.all([
    db.writingSubmission.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { feedback: true },
    }),
    db.speakingSubmission.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { feedback: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const sub of [...writings, ...speakings]) {
    const errors = (sub.feedback as { errors?: { type: string }[] } | null)?.errors ?? [];
    for (const e of errors) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const recommendations: Recommendation[] = [];

  // 2. Chapitres non complétés correspondant aux faiblesses
  const completed = new Set(
    (
      await db.lessonProgress.findMany({
        where: { userId, status: "COMPLETED" },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId)
  );

  // Récupère en une seule requête toutes les leçons correspondant aux thèmes
  // identifiés, puis distribue côté JS (évite N requêtes DB séquentielles).
  const allTopics = sorted.flatMap(([errorType]) => ERROR_TO_TOPICS[errorType] ?? []);
  const uniqueTopics = [...new Set(allTopics)];

  const candidateLessons =
    uniqueTopics.length > 0
      ? await db.lesson.findMany({
          where: {
            status: "PUBLISHED",
            id: { notIn: [...completed] },
            OR: uniqueTopics.map((t) => ({ title: { contains: t, mode: "insensitive" as const } })),
          },
          include: { course: { select: { title: true, level: true } } },
          take: sorted.length * 3, // plafond raisonnable
        })
      : [];

  for (const [errorType, count] of sorted) {
    const topics = ERROR_TO_TOPICS[errorType] ?? [];
    if (topics.length === 0) continue;
    const lessons = candidateLessons
      .filter((l) =>
        topics.some((t) => l.title.toLowerCase().includes(t.toLowerCase()))
      )
      .slice(0, 3);
    if (lessons.length === 0) continue;
    recommendations.push({
      reason: `${count} erreur(s) de type ${errorType} détectée(s) dans vos dernières productions`,
      errorType,
      count,
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        courseTitle: l.course.title,
        level: l.course.level,
      })),
    });
  }
  return recommendations;
}
