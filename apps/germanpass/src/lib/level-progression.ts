/**
 * Logique de déblocage progressif des niveaux CECRL.
 * Seuil : 5 sessions GRADED (Lesen/Hören) avec score moyen ≥ 70 %.
 */
import type { Level } from "@prisma/client";
import { db } from "@/lib/db";

export const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const UNLOCK_THRESHOLD_PCT = 70;
export const UNLOCK_MIN_SESSIONS = 5;

export type UnlockResult =
  | { unlocked: true; newLevel: Level }
  | { unlocked: false; progress: { sessions: number; avgPct: number } };

/**
 * Vérifie si l'utilisateur a atteint les critères de maîtrise pour `level`
 * et, si oui, débloque le niveau suivant.
 *
 * @param userId  ID de l'utilisateur
 * @param level   Niveau venant d'être pratiqué (niveau du passage soumis)
 */
export async function checkAndUnlockNextLevel(
  userId: string,
  level: Level
): Promise<UnlockResult> {
  const currentIdx = LEVEL_ORDER.indexOf(level);
  if (currentIdx === -1) {
    return { unlocked: false, progress: { sessions: 0, avgPct: 0 } };
  }

  const nextLevel = LEVEL_ORDER[currentIdx + 1];
  if (!nextLevel) {
    // Déjà au niveau C2, pas de niveau suivant
    return { unlocked: false, progress: { sessions: 0, avgPct: 0 } };
  }

  // Compte toutes les tentatives GRADED (practice) pour ce userId+level
  const attempts = await db.attempt.findMany({
    where: {
      userId,
      kind: "PRACTICE",
      status: "GRADED",
      passage: { level },
    },
    select: { scores: true },
  });

  const sessions = attempts.length;
  const avgPct =
    sessions > 0
      ? attempts.reduce((sum, a) => {
          const s = a.scores as { pct?: number } | null;
          return sum + (s?.pct ?? 0);
        }, 0) / sessions
      : 0;

  if (sessions < UNLOCK_MIN_SESSIONS || avgPct < UNLOCK_THRESHOLD_PCT) {
    return { unlocked: false, progress: { sessions, avgPct } };
  }

  // Vérifie que l'utilisateur n'a pas déjà dépassé ce niveau (requête parallèle)
  const [user] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { currentLevel: true } }),
  ]);
  if (!user) return { unlocked: false, progress: { sessions, avgPct } };

  const userLevelIdx = LEVEL_ORDER.indexOf(user.currentLevel);
  if (userLevelIdx > currentIdx) {
    // Déjà débloqué auparavant
    return { unlocked: false, progress: { sessions, avgPct } };
  }

  // Déblocage !
  await Promise.all([
    db.user.update({
      where: { id: userId },
      data: { currentLevel: nextLevel },
    }),
    db.levelMastery.upsert({
      where: { userId_level: { userId, level } },
      update: { sessionCount: sessions, avgPct, masteredAt: new Date() },
      create: { userId, level, sessionCount: sessions, avgPct },
    }),
  ]);

  return { unlocked: true, newLevel: nextLevel };
}
