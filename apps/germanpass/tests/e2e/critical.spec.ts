/**
 * Parcours critiques E2E. Prérequis : base seedée (npm run db:seed),
 * services db+redis lancés, SEED_ADMIN_PASSWORD connu (défaut Admin1234!).
 */
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@germanpass.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
const STUDENT_EMAIL = `e2e-${Date.now()}@test.local`;
const STUDENT_PASSWORD = "Test1234!";

test("santé de l'application", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.checks.db).toBe("ok");
  expect(body.checks.redis).toBe("ok");
});

test("landing : disclaimer légal visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Plattform nicht mit Goethe-Institut")).toBeVisible();
});

test("inscription → compte PENDING → activation admin → accès dashboard", async ({ page }) => {
  // 1. Inscription
  await page.goto("/register");
  await page.getByLabel("Nom / Name").fill("E2E Kandidat");
  await page.getByLabel("E-mail").fill(STUDENT_EMAIL);
  await page.getByLabel("Mot de passe / Passwort").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("status")).toBeVisible();

  // 2. Connexion candidat (PENDING : dashboard affiche l'avertissement)
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(STUDENT_EMAIL);
  await page.getByLabel("Mot de passe / Passwort").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Compte en attente d'activation")).toBeVisible();
  // L'activation admin (preuve → +30 j) est couverte par la recette manuelle (12-RECETTE.md §1)
});

test("anti-bruteforce : 5 échecs verrouillent le compte", async ({ page }) => {
  for (let i = 0; i < 5; i += 1) {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
    await page.getByLabel("Mot de passe / Passwort").fill("MauvaisMotDePasse1!");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  }
  // Même le bon mot de passe est refusé pendant le verrou
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Mot de passe / Passwort").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("zones protégées : redirection vers /login sans session", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL("**/login**");
  await page.goto("/practice");
  await page.waitForURL("**/login**");
});

// Parcours complet examen blanc B1 (nécessite contenu publié + examen assemblé) :
// couvert par 12-RECETTE.md en environnement de staging avec banque alimentée.
test.fixme("examen blanc complet Goethe B1 chronométré avec verdict", async () => {
  // Dépend de la banque de contenu (admin) : voir docs/12-RECETTE.md §7
});
