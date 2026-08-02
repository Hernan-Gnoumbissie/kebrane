/**
 * Répétition espacée SM-2 (SuperMemo 2) pour les flashcards.
 * quality: 0-5 (0 = oubli total, 5 = parfait).
 */
export type Sm2State = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type Sm2Result = Sm2State & { dueAt: Date };

export function sm2(state: Sm2State, quality: number, now: Date = new Date()): Sm2Result {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new Error("quality doit être un entier entre 0 et 5");
  }

  let { easeFactor, intervalDays, repetitions } = state;

  if (quality < 3) {
    // Échec : on repart au début, EF inchangé
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
  }

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    repetitions,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000),
  };
}
