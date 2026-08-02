import "./setup-env";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPastDeadline,
  nextSection,
  sectionDuration,
  parseStructure,
  DEADLINE_TOLERANCE_MS,
} from "@/lib/exam-runner";

const structure = {
  sections: [
    { section: "LESEN" as const, durationMin: 65, parts: [{ partNumber: 1, taskFormat: "MCQ_SINGLE", itemCount: 5, points: 5 }] },
    { section: "HOEREN" as const, durationMin: 40, parts: [{ partNumber: 1, taskFormat: "TRUE_FALSE", itemCount: 5, points: 5, maxListens: 2 }] },
    { section: "SCHREIBEN" as const, durationMin: 60, parts: [{ partNumber: 1, taskFormat: "LETTER_INFORMAL", itemCount: 1, points: 40 }] },
    { section: "SPRECHEN" as const, durationMin: 15, parts: [{ partNumber: 1, taskFormat: "PRESENTATION", itemCount: 1, points: 40 }] },
  ],
};

test("isPastDeadline : dans les temps", () => {
  const deadline = new Date(Date.now() + 60_000).toISOString();
  assert.equal(isPastDeadline(deadline), false);
});

test("isPastDeadline : dans la tolérance +5 s", () => {
  const now = new Date("2026-06-11T10:00:04Z");
  const deadline = new Date("2026-06-11T10:00:00Z").toISOString();
  assert.equal(isPastDeadline(deadline, now), false);
});

test("isPastDeadline : au-delà de la tolérance", () => {
  const now = new Date(`2026-06-11T10:00:0${Math.ceil((DEADLINE_TOLERANCE_MS + 1000) / 1000)}Z`);
  const deadline = new Date("2026-06-11T10:00:00Z").toISOString();
  assert.equal(isPastDeadline(deadline, now), true);
});

test("nextSection : enchaînement séquentiel sans retour arrière", () => {
  assert.equal(nextSection(structure, "LESEN"), "HOEREN");
  assert.equal(nextSection(structure, "HOEREN"), "SCHREIBEN");
  assert.equal(nextSection(structure, "SCHREIBEN"), "SPRECHEN");
  assert.equal(nextSection(structure, "SPRECHEN"), null);
});

test("sectionDuration : lit le blueprint", () => {
  assert.equal(sectionDuration(structure, "LESEN"), 65);
  assert.throws(() => sectionDuration({ sections: structure.sections.slice(0, 1) }, "SPRECHEN"));
});

test("parseStructure : structure invalide rejetée", () => {
  assert.throws(() =>
    parseStructure({ structure: { sections: [] } } as never)
  );
});
