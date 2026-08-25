import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DELAI_REVISION_MINUTES,
  ETAT_VIERGE,
  activitesAttendues,
  chapitreFranchi,
  exercicesAccessibles,
  leconDeverrouillee,
  leconEstComplete,
  minutesAvantNouvelleTentative,
  nouvelleTentativePossible,
  prochaineTentativeApresEchec,
  progressionChapitre,
  type EtatLecon,
  type Lecon,
} from "@/lib/progression-curriculum";

const lecon = (id: string, o: Partial<Lecon> = {}): Lecon => ({
  id,
  aAudio: false,
  estTestChapitre: false,
  ...o,
});

const etat = (o: Partial<EtatLecon> = {}): EtatLecon => ({ ...ETAT_VIERGE, ...o });

describe("activites attendues", () => {
  test("l'audio n'est exige que si la lecon en a un", () => {
    assert.deepEqual(activitesAttendues(lecon("a")), ["CONTENU", "EXERCICES"]);
    assert.deepEqual(activitesAttendues(lecon("b", { aAudio: true })), [
      "CONTENU",
      "AUDIO",
      "EXERCICES",
    ]);
  });
});

describe("acces aux exercices", () => {
  test("fermes tant que le contenu n'est pas suivi", () => {
    assert.equal(exercicesAccessibles(lecon("a"), ETAT_VIERGE), false);
  });

  test("ouverts des que le contenu est suivi — AUCUNE condition de score", () => {
    const e = etat({ activitesTerminees: ["CONTENU"], meilleurScore: 0 });
    assert.equal(exercicesAccessibles(lecon("a"), e), true);
  });

  test("une lecon avec audio exige aussi l'ecoute", () => {
    const avecAudio = lecon("a", { aAudio: true });
    assert.equal(exercicesAccessibles(avecAudio, etat({ activitesTerminees: ["CONTENU"] })), false);
    assert.equal(
      exercicesAccessibles(avecAudio, etat({ activitesTerminees: ["CONTENU", "AUDIO"] })),
      true
    );
  });
});

describe("lecon complete", () => {
  test("il faut TOUT faire et atteindre 70 %", () => {
    const l = lecon("a");
    assert.equal(
      leconEstComplete(l, etat({ activitesTerminees: ["CONTENU", "EXERCICES"], meilleurScore: 69 })),
      false
    );
    assert.equal(
      leconEstComplete(l, etat({ activitesTerminees: ["CONTENU", "EXERCICES"], meilleurScore: 70 })),
      true
    );
  });

  test("un bon score ne suffit pas si une activite manque", () => {
    const l = lecon("a", { aAudio: true });
    const e = etat({ activitesTerminees: ["CONTENU", "EXERCICES"], meilleurScore: 100 });
    assert.equal(leconEstComplete(l, e), false, "l'audio n'a pas ete ecoute");
  });
});

describe("delai apres echec", () => {
  const t0 = new Date("2026-08-25T10:00:00Z");

  test("l'echeance est fixee a quelques minutes, pas a des heures", () => {
    const echeance = prochaineTentativeApresEchec(t0);
    const minutes = (echeance.getTime() - t0.getTime()) / 60_000;
    assert.equal(minutes, DELAI_REVISION_MINUTES);
    assert.ok(minutes <= 30, "au-dela, le delai decourage au lieu de faire relire");
  });

  test("le temps restant est annonce en minutes, arrondi au superieur", () => {
    const e = etat({ prochaineTentativeLe: new Date("2026-08-25T10:09:30Z") });
    assert.equal(minutesAvantNouvelleTentative(e, t0), 10);
    assert.equal(minutesAvantNouvelleTentative(ETAT_VIERGE, t0), 0);
  });

  test("sans delai enregistre, on peut retenter", () => {
    assert.equal(nouvelleTentativePossible(ETAT_VIERGE, t0), true);
  });

  test("refuse avant l'echeance, autorise apres", () => {
    const e = etat({ prochaineTentativeLe: new Date("2026-08-25T12:00:00Z") });
    assert.equal(nouvelleTentativePossible(e, t0), false);
    assert.equal(nouvelleTentativePossible(e, new Date("2026-08-25T12:00:00Z")), true);
  });
});

describe("deverrouillage sequentiel", () => {
  const lecons = [lecon("l1"), lecon("l2"), lecon("l3")];
  const complete = etat({ activitesTerminees: ["CONTENU", "EXERCICES"], meilleurScore: 80 });

  test("la premiere lecon est toujours ouverte", () => {
    assert.equal(leconDeverrouillee(0, lecons, new Map()), true);
  });

  test("la suivante reste fermee tant que la precedente n'est pas complete", () => {
    assert.equal(leconDeverrouillee(1, lecons, new Map()), false);
  });

  test("elle s'ouvre quand la precedente est complete", () => {
    assert.equal(leconDeverrouillee(1, lecons, new Map([["l1", complete]])), true);
  });

  test("un trou au milieu bloque tout ce qui suit", () => {
    // l1 complete, l2 non : l3 doit rester fermee meme si l2 est "ouverte".
    const etats = new Map([["l1", complete]]);
    assert.equal(leconDeverrouillee(2, lecons, etats), false);
  });
});

describe("chapitre", () => {
  const complete = etat({ activitesTerminees: ["CONTENU", "EXERCICES"], meilleurScore: 80 });

  test("franchi quand le TEST de chapitre est reussi", () => {
    const lecons = [lecon("l1"), lecon("t", { estTestChapitre: true })];
    assert.equal(chapitreFranchi(lecons, new Map([["l1", complete]])), false);
    assert.equal(chapitreFranchi(lecons, new Map([["t", complete]])), true);
  });

  test("sans test declare, il faut toutes les lecons — on ne bloque pas sur une donnee manquante", () => {
    const lecons = [lecon("l1"), lecon("l2")];
    assert.equal(chapitreFranchi(lecons, new Map([["l1", complete]])), false);
    assert.equal(
      chapitreFranchi(lecons, new Map([["l1", complete], ["l2", complete]])),
      true
    );
  });

  test("un chapitre vide n'est pas franchi", () => {
    assert.equal(chapitreFranchi([], new Map()), false);
  });

  test("l'avancement se compte en pourcentage de lecons completes", () => {
    const lecons = [lecon("l1"), lecon("l2"), lecon("l3")];
    assert.equal(progressionChapitre(lecons, new Map()), 0);
    assert.equal(progressionChapitre(lecons, new Map([["l1", complete]])), 33);
    assert.equal(
      progressionChapitre(lecons, new Map([["l1", complete], ["l2", complete], ["l3", complete]])),
      100
    );
  });
});
