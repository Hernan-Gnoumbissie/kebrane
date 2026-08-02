import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSpeechMetrics, tokenize } from "@/lib/speech-metrics";
import { normalizeFeedback, countWords, writingFeedbackSchema } from "@/lib/writing-eval";

// ---------- Métriques Sprechen ----------
test("tokenize : ponctuation et casse normalisées", () => {
  assert.deepEqual(tokenize("Ich heiße, Anna! Über—alles."), ["ich", "heiße", "anna", "über", "alles"]);
});

test("computeSpeechMetrics : mots/min", () => {
  const transcript = Array.from({ length: 60 }, (_, i) => `wort${i}`).join(" ");
  const m = computeSpeechMetrics(transcript, 30);
  assert.equal(m.wordCount, 60);
  assert.equal(m.wpm, 120);
});

test("computeSpeechMetrics : durée nulle → wpm 0", () => {
  assert.equal(computeSpeechMetrics("hallo welt", 0).wpm, 0);
});

test("computeSpeechMetrics : répétitions détectées", () => {
  const m = computeSpeechMetrics("ich ich gehe und dann und dann nach hause", 10);
  assert.ok(m.repetitionRatio > 0);
});

test("computeSpeechMetrics : hésitations comptées", () => {
  const m = computeSpeechMetrics("äh ich ähm wohne hm in Berlin", 10);
  assert.equal(m.hesitationCount, 3);
});

test("computeSpeechMetrics : transcript vide", () => {
  const m = computeSpeechMetrics("", 30);
  assert.equal(m.wordCount, 0);
  assert.equal(m.repetitionRatio, 0);
});

// ---------- Parsing/validation feedback Schreiben ----------
const validFeedback = {
  perCriterion: [
    {
      key: "erfuellung",
      score: 4,
      max: 5,
      commentDe: "Das Thema ist gut abgedeckt.",
      commentNative: "Bonne couverture du sujet.",
    },
    {
      key: "kohaerenz",
      score: 3.5,
      max: 5,
      commentDe: "Abwechslungsreiche Konnektoren.",
      commentNative: "Connecteurs variés.",
    },
  ],
  totalPoints: 7.5,
  maxPoints: 10,
  estimatedLevel: "B1",
  errors: [
    {
      type: "Grammatik",
      excerpt: "ich habe gegangen",
      correction: "ich bin gegangen",
      explanationDe: "Bewegungsverb → Hilfsverb sein.",
      explanationNative: "Verbe de mouvement → auxiliaire sein.",
    },
  ],
  recommendationsDe: ["Wiederholen Sie die Hilfsverben im Perfekt."],
  recommendationsNative: ["Réviser les auxiliaires du Perfekt."],
  summaryDe: "Solide Leistung für das Niveau.",
  summaryNative: "Production solide pour le niveau.",
};

const criteria = [
  { key: "erfuellung", labelDe: "Erfüllung", maxPoints: 5 },
  { key: "kohaerenz", labelDe: "Kohärenz", maxPoints: 5 },
];

test("normalizeFeedback : feedback valide accepté, total recalculé", () => {
  const f = normalizeFeedback(validFeedback, criteria);
  assert.equal(f.totalPoints, 7.5);
  assert.equal(f.maxPoints, 10);
});

test("normalizeFeedback : score au-dessus du max → clampé et total recalculé", () => {
  const cheated = {
    ...validFeedback,
    perCriterion: [
      { key: "erfuellung", score: 99, max: 5, commentDe: "x", commentNative: "x" },
      { key: "kohaerenz", score: 2, max: 5, commentDe: "y", commentNative: "y" },
    ],
    totalPoints: 101,
  };
  const f = normalizeFeedback(cheated, criteria);
  assert.equal(f.perCriterion[0]?.score, 5);
  assert.equal(f.totalPoints, 7);
});

test("normalizeFeedback : type d'erreur inconnu → rejet Zod", () => {
  const bad = {
    ...validFeedback,
    errors: [{ type: "Aussprache", excerpt: "x", correction: "y", explanationDe: "z", explanationNative: "z" }],
  };
  assert.throws(() => normalizeFeedback(bad, criteria));
});

test("normalizeFeedback : JSON sans recommandations → rejet", () => {
  assert.throws(() => normalizeFeedback({ ...validFeedback, recommendationsDe: [] }, criteria));
});

test("writingFeedbackSchema : niveau estimé hors CECRL → rejet", () => {
  assert.equal(writingFeedbackSchema.safeParse({ ...validFeedback, estimatedLevel: "B3" }).success, false);
});

test("countWords", () => {
  assert.equal(countWords("  Liebe Anna,\n wie geht es dir?  "), 6);
  assert.equal(countWords(""), 0);
});
