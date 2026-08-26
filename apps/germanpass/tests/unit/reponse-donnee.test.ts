import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { compterDonnees, estRepondue } from "@/lib/reponse-donnee";

describe("une réponse a-t-elle été donnée", () => {
  test("rien saisi = pas répondu", () => {
    assert.equal(estRepondue(undefined), false);
    assert.equal(estRepondue(null), false);
    assert.equal(estRepondue(""), false);
    assert.equal(estRepondue("   "), false);
  });

  test("un choix simple compte", () => {
    assert.equal(estRepondue("opt_2"), true);
  });

  test("« faux » est une réponse, pas une absence de réponse", () => {
    // Le piège du vrai/faux : `false` est falsy en JavaScript. Le traiter comme
    // vide ferait passer pour blanche une copie où le candidat a répondu Falsch.
    assert.equal(estRepondue(false), true);
    assert.equal(estRepondue(true), true);
  });

  test("un QCM multiple effleuré mais vide ne compte pas", () => {
    assert.equal(estRepondue([]), false);
    assert.equal(estRepondue(["opt_1"]), true);
    assert.equal(estRepondue([""]), false);
  });

  test("un texte à trous compte dès qu'un trou est rempli", () => {
    // Exiger TOUS les trous ferait passer une copie partielle pour blanche, et
    // l'avertissement crierait au blanc sur une question travaillée.
    assert.equal(estRepondue({}), false);
    assert.equal(estRepondue({ gap_1: "", gap_2: "" }), false);
    assert.equal(estRepondue({ gap_1: "", gap_2: "Haus" }), true);
  });

  test("un appariement partiel compte", () => {
    assert.equal(estRepondue({ left_1: "right_3" }), true);
  });

  test("zéro est une valeur, pas un vide", () => {
    assert.equal(estRepondue(0), true);
  });
});

describe("décompte sur une section", () => {
  test("compte ce qui est réellement rempli", () => {
    const reponses = {
      q1: "opt_1",
      q2: [],
      q3: false,
      q4: { gap_1: "  " },
      q5: { gap_1: "Buch" },
    };
    assert.equal(compterDonnees(["q1", "q2", "q3", "q4", "q5"], reponses), 3);
  });

  test("une question jamais touchée n'est pas comptée", () => {
    assert.equal(compterDonnees(["q1", "q2"], { q1: "x" }), 1);
  });

  test("aucune question = zéro, sans erreur", () => {
    assert.equal(compterDonnees([], {}), 0);
  });
});
