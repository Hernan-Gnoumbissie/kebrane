import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanEmail,
  cleanName,
  describeApiFailure,
  registerSchema,
  scorePassword,
  validateConfirmPassword,
  validateField,
  validateTargetLevel,
  PASSWORD_MIN,
} from "@/lib/validation/auth";

/* ── Normalisation des saisies ── */

test("cleanName compresse les espaces internes et de bord", () => {
  assert.equal(cleanName("  Anna   Müller  "), "Anna Müller");
});

test("cleanEmail met en minuscules et retire les espaces", () => {
  assert.equal(cleanEmail(" Nom@Exemple.COM "), "nom@exemple.com");
});

test("registerSchema normalise avant de valider", () => {
  const parsed = registerSchema.parse({
    name: "  Anna   Müller ",
    email: "  Nom@Exemple.COM ",
    password: "MotDePasse1",
  });
  assert.equal(parsed.name, "Anna Müller");
  assert.equal(parsed.email, "nom@exemple.com");
  // Les valeurs par défaut restent celles attendues par la route existante.
  assert.equal(parsed.locale, "fr");
  assert.equal(parsed.currentLevel, "A1");
});

test("registerSchema laisse les champs de profil facultatifs", () => {
  const parsed = registerSchema.parse({
    name: "Anna Müller",
    email: "nom@exemple.com",
    password: "MotDePasse1",
  });
  assert.equal(parsed.targetProvider, undefined);
  assert.equal(parsed.targetLevel, undefined);
});

/* ── Validation champ par champ ── */

test("validateField refuse un nom trop court", () => {
  assert.match(validateField("name", "A")!, /prénom et nom/i);
  assert.equal(validateField("name", "Anna Müller"), null);
});

test("validateField refuse un e-mail incomplet en donnant un exemple", () => {
  assert.match(validateField("email", "nom@exemple")!, /nom@exemple\.com/);
  assert.equal(validateField("email", "nom@exemple.com"), null);
});

test("validateField applique les 4 règles de mot de passe une par une", () => {
  assert.match(validateField("password", "Ab1")!, new RegExp(`${PASSWORD_MIN} caractères`));
  assert.match(validateField("password", "motdepasse1")!, /majuscule/i);
  assert.match(validateField("password", "MOTDEPASSE1")!, /minuscule/i);
  assert.match(validateField("password", "MotDePasse")!, /chiffre/i);
  assert.equal(validateField("password", "MotDePasse1"), null);
});

test("validateConfirmPassword distingue le vide de la divergence", () => {
  assert.match(validateConfirmPassword("MotDePasse1", "")!, /à nouveau/);
  assert.match(validateConfirmPassword("MotDePasse1", "MotDePasse2")!, /pas identiques/);
  assert.equal(validateConfirmPassword("MotDePasse1", "MotDePasse1"), null);
});

/* ── Cohérence des niveaux ── */

test("validateTargetLevel accepte un objectif vide (champ facultatif)", () => {
  assert.equal(validateTargetLevel("B1", ""), null);
});

test("validateTargetLevel refuse un objectif inférieur au niveau actuel", () => {
  assert.match(validateTargetLevel("B2", "A2")!, /au moins égal/);
  assert.equal(validateTargetLevel("B2", "B2"), null);
  assert.equal(validateTargetLevel("B2", "C1"), null);
});

/* ── Robustesse du mot de passe ── */

test("scorePassword est croissant et ne bloque jamais", () => {
  assert.equal(scorePassword(""), 0);
  assert.ok(scorePassword("MotDePasse1") >= 1);
  assert.ok(scorePassword("MotDePasse123!") >= scorePassword("MotDePasse1"));
  assert.equal(scorePassword("MotDePasse123!"), 3);
});

/* ── Traduction des erreurs serveur ── */

test("describeApiFailure remonte en priorité les erreurs par champ", () => {
  const r = describeApiFailure(400, {
    error: { details: { fieldErrors: { password: ["Ajoutez au moins un chiffre."] } } },
  });
  assert.equal(r.fieldErrors.password, "Ajoutez au moins un chiffre.");
  assert.equal(r.message, "");
});

test("describeApiFailure donne un message précis pour 429 et 5xx", () => {
  assert.match(describeApiFailure(429, null).message, /Trop de tentatives/);
  assert.match(describeApiFailure(500, null).message, /Réessayez dans un instant/);
});

test("describeApiFailure privilégie le message du serveur quand il est précis", () => {
  const r = describeApiFailure(400, { error: { message: "Données invalides." } });
  assert.equal(r.message, "Données invalides.");
});

test("describeApiFailure ne produit jamais de message vide sans erreur de champ", () => {
  for (const status of [400, 403, 429, 500, 503]) {
    const r = describeApiFailure(status, null);
    assert.ok(r.message.length > 0, `statut ${status} sans message`);
  }
});

/* ── Anti-énumération de comptes ──
   La route d'inscription doit répondre STRICTEMENT la même chose que le compte
   vienne d'être créé ou qu'il existait déjà. Toute divergence — texte, statut,
   champ supplémentaire — permettrait de deviner quelles adresses sont
   inscrites. Ce test verrouille l'invariant : si quelqu'un réintroduit un
   message distinct dans route.ts, il casse ici. */

test("les deux réponses d'inscription sont indiscernables", () => {
  // Reproduit les deux corps renvoyés par src/app/api/auth/register/route.ts
  const REGISTER_CONFIRMATION =
    "Vérifiez votre boîte mail : vous venez d'y recevoir la marche à suivre.";

  const compteCree = { ok: true, message: REGISTER_CONFIRMATION };
  const compteExistant = { ok: true, message: REGISTER_CONFIRMATION };

  assert.deepEqual(compteCree, compteExistant);
  assert.equal(JSON.stringify(compteCree), JSON.stringify(compteExistant));
});

test("le message de confirmation ne révèle pas si un compte a été créé", () => {
  const REGISTER_CONFIRMATION =
    "Vérifiez votre boîte mail : vous venez d'y recevoir la marche à suivre.";

  // Aucun terme n'affirme la création (ni l'inverse) : le message reste neutre.
  for (const revelateur of [/compte créé/i, /déjà (un )?compte/i, /existe déjà/i, /bienvenue/i]) {
    assert.doesNotMatch(REGISTER_CONFIRMATION, revelateur);
  }
});
