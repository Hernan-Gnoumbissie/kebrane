/**
 * Agrégation de la progression d'un candidat : historique des scores,
 * forces/faiblesses par compétence et par format, plan d'amélioration heuristique.
 * Utilisé par le tableau de bord (rendu serveur) et /api/progress.
 */
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { getRecommendations } from "@/lib/recommendations";

export type PlanAction = {
  priority: number; // 1 = le plus urgent
  title: string;
  detail: string;
  href: string;
};

export type ProgressData = {
  history: { date: string; kind: string; section: string | null; pct: number }[];
  sections: { section: string; label: string; pct: number; answered: number }[];
  formats: { section: string; taskFormat: string; pct: number; answered: number }[];
  production: { writingCount: number; speakingCount: number; lastEstimatedLevel: string | null };
  lessonsDone: number;
  dueCards: number;
  plan: PlanAction[];
  target: { provider: string | null; level: string | null; plan: string };
};

export const SECTION_LABEL: Record<string, string> = {
  LESEN: "Lesen",
  HOEREN: "Hören",
  SCHREIBEN: "Schreiben",
  SPRECHEN: "Sprechen",
};

/**
 * Chaque compétence a désormais sa propre adresse.
 *
 * Le plan renvoyait tout le monde sur `/practice`, où il fallait re-choisir la
 * compétence dans un menu — un conseil qui nomme précisément ce qu'il faut
 * travailler ne devrait pas redemander de quoi il parle.
 */
export const SECTION_HREF: Record<string, string> = {
  LESEN: "/practice/lesen",
  HOEREN: "/practice/hoeren",
  SCHREIBEN: "/practice/schreiben",
  SPRECHEN: "/practice/sprechen",
};

export async function getProgressData(user: User): Promise<ProgressData> {
  const [attempts, answers, writings, speakings, lessonsDone, dueCards, recommendations] =
    await Promise.all([
      db.attempt.findMany({
        where: { userId: user.id, status: { in: ["SUBMITTED", "GRADED"] } },
        orderBy: { startedAt: "asc" },
        take: 100,
        select: { id: true, kind: true, section: true, scores: true, submittedAt: true },
      }),
      db.attemptAnswer.findMany({
        where: { attempt: { userId: user.id }, isCorrect: { not: null } },
        orderBy: { gradedAt: "desc" },
        take: 500,
        select: { isCorrect: true, question: { select: { taskFormat: true, section: true } } },
      }),
      db.writingSubmission.findMany({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { scores: true, createdAt: true },
      }),
      db.speakingSubmission.findMany({
        where: { userId: user.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { scores: true, createdAt: true },
      }),
      db.lessonProgress.count({ where: { userId: user.id, status: "COMPLETED" } }),
      db.flashcardReview.count({ where: { userId: user.id, dueAt: { lte: new Date() } } }),
      getRecommendations(user.id),
    ]);

  // --- Historique des scores (entraînements + examens) ---
  const history = attempts
    .map((a) => {
      const s = a.scores as { pct?: number; totalPct?: number } | null;
      const pct = s?.pct ?? s?.totalPct;
      if (pct === undefined || !a.submittedAt) return null;
      return {
        date: a.submittedAt.toISOString(),
        kind: a.kind as string,
        section: a.section as string | null,
        pct: Math.round(pct * 10) / 10,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // --- Réussite par compétence et par format (réponses détaillées) ---
  const bySection = new Map<string, { ok: number; total: number }>();
  const byFormat = new Map<string, { ok: number; total: number; section: string }>();
  for (const ans of answers) {
    const sec = ans.question.section;
    const fmt = ans.question.taskFormat;
    const s = bySection.get(sec) ?? { ok: 0, total: 0 };
    s.total += 1;
    if (ans.isCorrect) s.ok += 1;
    bySection.set(sec, s);
    const key = `${sec}:${fmt}`;
    const f = byFormat.get(key) ?? { ok: 0, total: 0, section: sec };
    f.total += 1;
    if (ans.isCorrect) f.ok += 1;
    byFormat.set(key, f);
  }

  const sections = [...bySection.entries()].map(([section, v]) => ({
    section,
    label: SECTION_LABEL[section] ?? section,
    pct: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0,
    answered: v.total,
  }));

  const formats = [...byFormat.entries()]
    .filter(([, v]) => v.total >= 5)
    .map(([key, v]) => ({
      section: v.section,
      taskFormat: key.split(":")[1] as string,
      pct: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0,
      answered: v.total,
    }))
    .sort((a, b) => a.pct - b.pct);

  // --- Productions (Schreiben / Sprechen) ---
  const lastWriting = writings[0]?.scores as { estimatedLevel?: string } | null | undefined;
  const production = {
    writingCount: writings.length,
    speakingCount: speakings.length,
    lastEstimatedLevel: lastWriting?.estimatedLevel ?? null,
  };

  // --- Plan d'amélioration heuristique ---
  const plan: PlanAction[] = [];
  // Le plan porte sur le niveau DÉBLOQUÉ, pas sur l'objectif : on proposait un
  // examen blanc B1 à un apprenant A1 (repli codé en dur sur "B1" quand aucun
  // objectif n'est saisi). Conseiller un exercice hors de portée n'oriente pas,
  // il décourage. `currentLevel` a A1 pour défaut en base : plus de repli.
  const level = user.currentLevel;

  for (const s of sections) {
    if (s.pct < 60 && s.answered >= 5) {
      plan.push({
        priority: 1,
        title: `Renforcer ${s.label} (${s.pct} % de réussite)`,
        detail: `Refaites des entraînements ${s.label} au niveau ${level} pour remonter au-dessus de 60 %.`,
        href: SECTION_HREF[s.section] ?? "/practice/lesen",
      });
    }
  }
  for (const f of formats.slice(0, 3)) {
    if (f.pct < 60) {
      plan.push({
        priority: 2,
        title: `Travailler le format « ${f.taskFormat} » en ${SECTION_LABEL[f.section] ?? f.section} (${f.pct} %)`,
        detail: "Ce type de tâche revient dans l'examen — entraînez-vous spécifiquement dessus.",
        href: SECTION_HREF[f.section] ?? "/practice/lesen",
      });
    }
  }
  const hasLearnAccess = user.role === "ADMIN" || user.plan === "FULL";
  if (hasLearnAccess) {
    for (const r of recommendations) {
      plan.push({
        priority: 3,
        title: `Revoir : ${r.lessons.map((l) => l.title).join(", ")}`,
        detail: r.reason,
        href: "/learn",
      });
    }
    if (dueCards > 0) {
      plan.push({
        priority: 4,
        title: `Réviser ${dueCards} flashcard(s) en attente`,
        detail: "La répétition espacée ne fonctionne que si les révisions sont faites à temps.",
        href: "/learn",
      });
    }
  }
  if (!attempts.some((a) => a.kind === "MOCK")) {
    plan.push({
      priority: 5,
      title: "Faire un examen blanc complet",
      detail: `Passez un examen blanc ${user.targetProvider ?? ""} ${level} en conditions réelles pour situer votre niveau global.`.trim(),
      href: "/exams",
    });
  }
  plan.sort((a, b) => a.priority - b.priority);

  return {
    history,
    sections,
    formats,
    production,
    lessonsDone,
    dueCards,
    plan,
    target: { provider: user.targetProvider, level: user.targetLevel, plan: user.plan },
  };
}
