/**
 * Parcours critiques E2E.
 *
 * Prérequis : services db+redis lancés, base seedée (`npm run db:seed`).
 *
 * ⚠ Les parcours d'AUTHENTIFICATION ne sont plus couverts ici (KB-37). Ils
 * pilotaient un formulaire e-mail/mot de passe maison qui n'existe plus : la
 * connexion est passée au composant `<SignIn>` de Clerk. Les tests ne
 * signalaient pas la régression parce qu'ils étaient inexécutables — aucun
 * navigateur Playwright n'était installé. Ce qui les rendait pires
 * qu'absents : ils donnaient l'illusion d'une couverture.
 *
 * Ce qui a été RETIRÉ, et pourquoi :
 *  - « inscription → compte PENDING → activation admin » : pilotait
 *    `getByLabel("Mot de passe / Passwort")`, champ supprimé.
 *  - « anti-bruteforce : 5 échecs verrouillent le compte » : ce verrou était
 *    NOTRE code. Il est aujourd'hui assuré par Clerk. Tester la protection
 *    anti-bruteforce d'un prestataire n'est pas notre travail — c'est la
 *    sienne, et elle changera sans nous prévenir.
 *
 * Ce qu'il faudrait pour les REMPLACER : un utilisateur de test créé par l'API
 * Backend de Clerk et les *testing tokens* de Clerk, qui contournent le bot
 * detection en environnement de test. Chantier à part entière, non fait.
 */
import { test, expect } from "@playwright/test";

test("santé de l'application", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.checks.db).toBe("ok");
  expect(body.checks.redis).toBe("ok");
});

test("landing : disclaimer légal visible", async ({ page }) => {
  // Mention d'indépendance vis-à-vis des organismes certificateurs : elle est
  // une obligation, pas une décoration. Si elle disparaît de la landing, on
  // doit le savoir avant un juriste.
  await page.goto("/");
  await expect(page.getByText("Plattform nicht mit Goethe-Institut")).toBeVisible();
});

test("zones protégées : redirection vers /login sans session", async ({ page }) => {
  // Le proxy fait cette redirection sans jamais toucher au formulaire : ce test
  // survit donc au changement de fournisseur d'identité, contrairement aux
  // parcours qui remplissaient des champs.
  await page.goto("/admin");
  await page.waitForURL("**/login**");
  await page.goto("/practice");
  await page.waitForURL("**/login**");
});

test("/login monte bien l'écran de connexion Clerk", async ({ page }) => {
  // Volontairement SUPERFICIEL : on vérifie que la porte d'entrée s'ouvre, pas
  // le comportement interne de Clerk. Une clé publique absente ou une erreur
  // de configuration laisserait une page vide — c'est ce cas-là qu'on attrape,
  // et c'est le plus fréquent.
  await page.goto("/login");
  await expect(page.locator(".cl-rootBox").first()).toBeVisible({ timeout: 30_000 });
});

// Parcours complet examen blanc B1 : dépend d'une banque de contenu alimentée.
// La base de dev n'en a AUCUNE (0 examen blanc, 0 question, 0 passage — voir
// KB-36) ; ce test ne pourra pas être écrit avant que ce contenu existe.
test.fixme("examen blanc complet Goethe B1 chronométré avec verdict", () => {
  // Voir docs/12-RECETTE.md §7 et KB-36.
});
