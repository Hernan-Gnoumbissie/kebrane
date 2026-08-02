import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeAnswer, normalizeAnswer, type GradableQuestion } from "@/lib/correction";

const base = (taskFormat: string, overrides: Partial<GradableQuestion> = {}): GradableQuestion => ({
  id: "q1",
  taskFormat,
  points: 2,
  metadata: null,
  options: [],
  ...overrides,
});

test("MCQ_SINGLE : bonne réponse → points complets", () => {
  const q = base("MCQ_SINGLE", {
    options: [
      { id: "a", isCorrect: false },
      { id: "b", isCorrect: true },
    ],
  });
  assert.deepEqual(gradeAnswer(q, { optionIds: ["b"] }), { isCorrect: true, pointsAwarded: 2 });
});

test("MCQ_SINGLE : mauvaise réponse → 0", () => {
  const q = base("MCQ_SINGLE", {
    options: [
      { id: "a", isCorrect: false },
      { id: "b", isCorrect: true },
    ],
  });
  assert.deepEqual(gradeAnswer(q, { optionIds: ["a"] }), { isCorrect: false, pointsAwarded: 0 });
});

test("MCQ_SINGLE : plusieurs options cochées → 0 même si la bonne est incluse", () => {
  const q = base("MCQ_SINGLE", {
    options: [
      { id: "a", isCorrect: false },
      { id: "b", isCorrect: true },
    ],
  });
  assert.equal(gradeAnswer(q, { optionIds: ["a", "b"] }).pointsAwarded, 0);
});

test("MCQ_SINGLE : réponse vide → 0", () => {
  const q = base("MCQ_SINGLE", { options: [{ id: "a", isCorrect: true }] });
  assert.equal(gradeAnswer(q, { optionIds: [] }).pointsAwarded, 0);
});

test("MCQ_MULTI : ensemble exact requis", () => {
  const q = base("MCQ_MULTI", {
    options: [
      { id: "a", isCorrect: true },
      { id: "b", isCorrect: true },
      { id: "c", isCorrect: false },
    ],
  });
  assert.equal(gradeAnswer(q, { optionIds: ["a", "b"] }).isCorrect, true);
  assert.equal(gradeAnswer(q, { optionIds: ["b", "a"] }).isCorrect, true);
  assert.equal(gradeAnswer(q, { optionIds: ["a"] }).isCorrect, false);
  assert.equal(gradeAnswer(q, { optionIds: ["a", "b", "c"] }).isCorrect, false);
});

test("TRUE_FALSE via metadata.correct", () => {
  const q = base("TRUE_FALSE", { metadata: { correct: true } });
  assert.equal(gradeAnswer(q, { value: true }).isCorrect, true);
  assert.equal(gradeAnswer(q, { value: false }).isCorrect, false);
});

test("TRUE_FALSE via options (1re option = Richtig)", () => {
  const q = base("TRUE_FALSE", {
    options: [
      { id: "r", isCorrect: true },
      { id: "f", isCorrect: false },
    ],
  });
  assert.equal(gradeAnswer(q, { value: true }).isCorrect, true);
});

test("TRUE_FALSE sans vérité définie → erreur", () => {
  const q = base("TRUE_FALSE");
  assert.throws(() => gradeAnswer(q, { value: true }));
});

test("MATCHING : crédit partiel proportionnel", () => {
  const q = base("MATCHING", {
    points: 4,
    metadata: {
      pairs: [
        { leftId: "l1", rightId: "r1" },
        { leftId: "l2", rightId: "r2" },
        { leftId: "l3", rightId: "r3" },
        { leftId: "l4", rightId: "r4" },
      ],
    },
  });
  const result = gradeAnswer(q, {
    pairs: [
      { leftId: "l1", rightId: "r1" },
      { leftId: "l2", rightId: "r3" }, // faux
      { leftId: "l3", rightId: "r3" },
      { leftId: "l4", rightId: "r4" },
    ],
  });
  assert.equal(result.isCorrect, false);
  assert.equal(result.pointsAwarded, 3);
});

test("MATCHING : doublons de leftId ignorés", () => {
  const q = base("MATCHING", {
    points: 2,
    metadata: { pairs: [{ leftId: "l1", rightId: "r1" }, { leftId: "l2", rightId: "r2" }] },
  });
  const result = gradeAnswer(q, {
    pairs: [
      { leftId: "l1", rightId: "r1" },
      { leftId: "l1", rightId: "r2" },
    ],
  });
  assert.equal(result.pointsAwarded, 1);
});

test("MATCHING : tout correct → points complets", () => {
  const q = base("MATCHING", {
    points: 2,
    metadata: { pairs: [{ leftId: "l1", rightId: "r1" }] },
  });
  assert.deepEqual(gradeAnswer(q, { pairs: [{ leftId: "l1", rightId: "r1" }] }), {
    isCorrect: true,
    pointsAwarded: 2,
  });
});

test("GAP_FILL : normalisation casse/espaces, variantes acceptées", () => {
  const q = base("GAP_FILL", {
    points: 3,
    metadata: {
      gaps: [
        { gapId: "g1", accepted: ["dem Mann", "dem  Mann"] },
        { gapId: "g2", accepted: ["geht"] },
        { gapId: "g3", accepted: ["Hause"] },
      ],
    },
  });
  const result = gradeAnswer(q, {
    gaps: [
      { gapId: "g1", value: "  DEM   mann " },
      { gapId: "g2", value: "geht" },
      { gapId: "g3", value: "Haus" }, // faux
    ],
  });
  assert.equal(result.isCorrect, false);
  assert.equal(result.pointsAwarded, 2);
});

test("GAP_FILL : trou manquant compté faux", () => {
  const q = base("GAP_FILL", {
    points: 2,
    metadata: { gaps: [{ gapId: "g1", accepted: ["ist"] }, { gapId: "g2", accepted: ["hat"] }] },
  });
  assert.equal(gradeAnswer(q, { gaps: [{ gapId: "g1", value: "ist" }] }).pointsAwarded, 1);
});

test("ORDERING : crédit par position", () => {
  const q = base("ORDERING", {
    points: 4,
    metadata: { correctOrder: ["a", "b", "c", "d"] },
  });
  assert.equal(gradeAnswer(q, { order: ["a", "b", "c", "d"] }).pointsAwarded, 4);
  assert.equal(gradeAnswer(q, { order: ["a", "c", "b", "d"] }).pointsAwarded, 2);
  assert.equal(gradeAnswer(q, { order: ["d", "a", "b", "c"] }).pointsAwarded, 0);
});

test("ORDERING : réponse incomplète → positions manquantes fausses", () => {
  const q = base("ORDERING", { points: 2, metadata: { correctOrder: ["a", "b"] } });
  assert.equal(gradeAnswer(q, { order: ["a"] }).pointsAwarded, 1);
});

test("format productif → erreur", () => {
  assert.throws(() => gradeAnswer(base("ESSAY"), {}));
});

test("réponse malformée → erreur Zod", () => {
  const q = base("MCQ_SINGLE", { options: [{ id: "a", isCorrect: true }] });
  assert.throws(() => gradeAnswer(q, { foo: "bar" }));
});

test("normalizeAnswer", () => {
  assert.equal(normalizeAnswer("  Der   HUND "), "der hund");
});
