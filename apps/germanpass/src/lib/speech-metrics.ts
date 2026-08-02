/**
 * Métriques simples de fluidité sur transcription (Sprechen) :
 * mots/minute, ratio de répétitions, marqueurs d'hésitation.
 * Fonctions pures et testables.
 */
export type SpeechMetrics = {
  wordCount: number;
  wpm: number;
  repetitionRatio: number; // bigrammes répétés / bigrammes totaux
  hesitationCount: number; // "äh", "ähm", "also"...
};

const HESITATION_MARKERS = ["äh", "ähm", "ehm", "mhm", "hm"];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function computeSpeechMetrics(transcript: string, durationSec: number): SpeechMetrics {
  const words = tokenize(transcript);
  const wordCount = words.length;
  const wpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;

  // Répétitions : bigrammes identiques consécutifs ("ich ich", "und dann und dann")
  let repeated = 0;
  let bigrams = 0;
  for (let i = 1; i < words.length; i += 1) {
    bigrams += 1;
    if (words[i] === words[i - 1]) repeated += 1;
    if (i >= 3 && words[i] === words[i - 2] && words[i - 1] === words[i - 3]) repeated += 1;
  }
  const repetitionRatio = bigrams > 0 ? Math.round((repeated / bigrams) * 1000) / 1000 : 0;

  const hesitationCount = words.filter((w) => HESITATION_MARKERS.includes(w)).length;

  return { wordCount, wpm, repetitionRatio, hesitationCount };
}
