import { test } from "node:test";
import assert from "node:assert/strict";
import { computeExamResult, pct, roundHalfUp, type ScoringRules, type SectionScore } from "@/lib/scoring";

const sections = (l: number, h: number, sc: number, sp: number, max = 100): SectionScore[] => [
  { section: "LESEN", points: l, maxPoints: max },
  { section: "HOEREN", points: h, maxPoints: max },
  { section: "SCHREIBEN", points: sc, maxPoints: max },
  { section: "SPRECHEN", points: sp, maxPoints: max },
];

const GOETHE: ScoringRules = { passThresholdPct: 60, modular: true, perSectionThresholdPct: 60, rounding: "half_up" };
const TELC: ScoringRules = { passThresholdPct: 60, modular: false, oralSeparate: true, rounding: "half_up" };
const ECL: ScoringRules = {
  passThresholdPct: 60,
  modular: false,
  perSkillMinPct: 40,
  averageAcrossSkills: true,
  rounding: "half_up",
};
const OSD: ScoringRules = { passThresholdPct: 60, modular: false, perSectionThresholdPct: 50, rounding: "half_up" };
const SIMPLE: ScoringRules = { passThresholdPct: 60, modular: false, rounding: "half_up" };
const TESTDAF: ScoringRules = {
  passThresholdPct: 0,
  modular: false,
  tdn: true,
  tdnThresholds: { tdn3: 40, tdn4: 60, tdn5: 80 },
  rounding: "half_up",
};

test("roundHalfUp : 59,95 → 60 ; 59,94 → 59,9", () => {
  assert.equal(roundHalfUp(59.95), 60);
  assert.equal(roundHalfUp(59.94), 59.9);
});

test("pct : maxPoints 0 → 0", () => {
  assert.equal(pct(10, 0), 0);
});

test("Goethe modulaire : exactement 60 % partout → bestanden", () => {
  const r = computeExamResult(GOETHE, sections(60, 60, 60, 60));
  assert.equal(r.verdict, "bestanden");
  assert.ok(r.perSection.every((s) => s.passed === true));
});

test("Goethe modulaire : un module à 59,9 % → nicht bestanden", () => {
  const r = computeExamResult(GOETHE, sections(59.9, 100, 100, 100));
  assert.equal(r.verdict, "nicht_bestanden");
  assert.equal(r.perSection[0]?.passed, false);
  assert.equal(r.perSection[1]?.passed, true);
});

test("TELC : écrit ≥60 et oral ≥60 séparément → bestanden", () => {
  const r = computeExamResult(TELC, sections(60, 60, 60, 60));
  assert.equal(r.verdict, "bestanden");
});

test("TELC : écrit fort mais oral 59 % → nicht bestanden", () => {
  const r = computeExamResult(TELC, sections(90, 90, 90, 59));
  assert.equal(r.verdict, "nicht_bestanden");
});

test("TELC : oral fort mais écrit < 60 % → nicht bestanden", () => {
  const r = computeExamResult(TELC, sections(50, 50, 50, 100));
  assert.equal(r.verdict, "nicht_bestanden");
});

test("TELC : pas de section orale → seul l'écrit compte", () => {
  const r = computeExamResult(TELC, [
    { section: "LESEN", points: 70, maxPoints: 100 },
    { section: "HOEREN", points: 60, maxPoints: 100 },
  ]);
  assert.equal(r.verdict, "bestanden");
});

test("ECL : moyenne 60 avec toutes les compétences ≥ 40 → bestanden", () => {
  const r = computeExamResult(ECL, sections(80, 80, 40, 40));
  assert.equal(r.verdict, "bestanden");
  assert.equal(r.totalPct, 60);
});

test("ECL : moyenne ≥ 60 mais une compétence à 39 % → nicht bestanden", () => {
  const r = computeExamResult(ECL, sections(100, 100, 39, 80));
  assert.equal(r.verdict, "nicht_bestanden");
  assert.equal(r.perSection[2]?.passed, false);
});

test("ECL : compétence exactement à 40 % → minimum respecté", () => {
  const r = computeExamResult(ECL, sections(80, 80, 40, 80));
  assert.equal(r.verdict, "bestanden");
});

test("ECL : moyenne 59,9 → nicht bestanden", () => {
  const r = computeExamResult(ECL, sections(59.9, 59.9, 59.9, 59.9));
  assert.equal(r.verdict, "nicht_bestanden");
});

test("ÖSD : total ≥ 60 mais une épreuve sous le plancher 50 → nicht bestanden", () => {
  const r = computeExamResult(OSD, sections(100, 100, 100, 45));
  assert.equal(r.verdict, "nicht_bestanden");
});

test("ÖSD : total ≥ 60 et planchers respectés → bestanden", () => {
  const r = computeExamResult(OSD, sections(70, 70, 55, 50));
  assert.equal(r.verdict, "bestanden");
});

test("Cas général sans plancher : total exactement 60 % → bestanden", () => {
  const r = computeExamResult(SIMPLE, sections(60, 60, 60, 60));
  assert.equal(r.verdict, "bestanden");
});

test("Cas général : total 59,9 % → nicht bestanden", () => {
  const r = computeExamResult(SIMPLE, sections(59.9, 59.9, 59.9, 59.9));
  assert.equal(r.verdict, "nicht_bestanden");
});

test("TestDaF : verdict tdn, un niveau TDN par module selon les seuils", () => {
  const r = computeExamResult(TESTDAF, sections(85, 65, 45, 30));
  assert.equal(r.verdict, "tdn");
  assert.equal(r.perSection[0]?.tdn, "TDN 5"); // 85 % ≥ 80
  assert.equal(r.perSection[1]?.tdn, "TDN 4"); // 65 % ≥ 60
  assert.equal(r.perSection[2]?.tdn, "TDN 3"); // 45 % ≥ 40
  assert.equal(r.perSection[3]?.tdn, "unter TDN 3"); // 30 % < 40
  assert.ok(r.perSection.every((s) => s.passed === null));
});

test("TestDaF : seuils par défaut appliqués si tdnThresholds absent", () => {
  const r = computeExamResult(
    { passThresholdPct: 0, modular: false, tdn: true, rounding: "half_up" },
    sections(80, 60, 40, 39)
  );
  assert.equal(r.perSection[0]?.tdn, "TDN 5");
  assert.equal(r.perSection[3]?.tdn, "unter TDN 3");
});

test("Barèmes hétérogènes : pondération par points réels (telc B1 : écrit 225, oral 75)", () => {
  const r = computeExamResult(TELC, [
    { section: "LESEN", points: 75, maxPoints: 75 },
    { section: "HOEREN", points: 75, maxPoints: 75 },
    { section: "SCHREIBEN", points: 0, maxPoints: 75 },
    { section: "SPRECHEN", points: 75, maxPoints: 75 },
  ]);
  // écrit = 150/225 = 66,7 % ≥ 60, oral = 100 % → bestanden
  assert.equal(r.verdict, "bestanden");
});
