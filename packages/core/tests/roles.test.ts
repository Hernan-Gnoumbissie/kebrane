import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts, Role } from "../src/index";
import { db, tracker, testEmail, testClerkId, countEvents } from "./helpers";

/**
 * KB-20 — attribution des rôles.
 *
 * C'est le chemin qui accorde des PRIVILÈGES : il mérite plus d'attention que
 * le reste. Deux exigences non négociables :
 *  - toute promotion ou rétrogradation laisse une trace en gravité IMPORTANT ;
 *  - un compte n'obtient jamais de privilège par accident (le défaut est
 *    MEMBER, et le bootstrap ne vise QUE l'email configuré).
 */
describe("accounts.setRole", () => {
  const t = tracker();
  after(() => t.cleanup());

  async function member(label: string) {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId(label),
      email: testEmail(label),
      name: "Ada",
    });
    t.account(account.id);
    assert.equal(account.role, "MEMBER", "un compte naît toujours sans privilège");
    return account;
  }

  test("promeut et journalise la transition", async () => {
    const account = await member("promote");

    const updated = await accounts.setRole(account.id, Role.ADMIN, { source: "test" });

    assert.equal(updated?.role, "ADMIN");
    assert.equal(await countEvents(account.id, "account.role_changed"), 1);

    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "account.role_changed" },
    });
    assert.equal(evt?.severity, "IMPORTANT", "un changement de privilège n'est jamais anodin");
    assert.deepEqual(evt?.data, { from: "MEMBER", to: "ADMIN", source: "test" });
  });

  test("rétrograde aussi, et le trace tout autant", async () => {
    const account = await member("demote");

    await accounts.setRole(account.id, Role.ADMIN);
    const back = await accounts.setRole(account.id, Role.MEMBER);

    assert.equal(back?.role, "MEMBER");
    assert.equal(await countEvents(account.id, "account.role_changed"), 2);
  });

  test("réattribuer le même rôle n'écrit ni ne journalise rien", async () => {
    const account = await member("noop");

    await accounts.setRole(account.id, Role.STAFF);
    const before = (await db.account.findUnique({ where: { id: account.id } }))!.updatedAt;

    await accounts.setRole(account.id, Role.STAFF);
    await accounts.setRole(account.id, Role.STAFF);

    const after_ = (await db.account.findUnique({ where: { id: account.id } }))!;
    assert.deepEqual(after_.updatedAt, before, "aucune réécriture");
    assert.equal(
      await countEvents(account.id, "account.role_changed"),
      1,
      "le journal ne doit contenir que de VRAIS changements"
    );
  });

  test("compte inconnu : retourne null plutôt que d'échouer", async () => {
    assert.equal(await accounts.setRole("compte-qui-nexiste-pas", Role.ADMIN), null);
  });
});

/**
 * Bootstrap par variable d'environnement — le tout premier admin, quand aucun
 * admin n'existe encore pour en promouvoir un autre.
 */
describe("bootstrap du premier admin (KEBRANE_BOOTSTRAP_ADMIN_EMAIL)", () => {
  const t = tracker();
  const previous = process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL;
  after(async () => {
    process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL = previous;
    await t.cleanup();
  });

  test("le compte créé pour l'email configuré naît ADMIN, et c'est journalisé", async () => {
    const email = testEmail("bootstrap");
    process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL = email.toUpperCase(); // casse indifférente

    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("bootstrap"),
      email,
      name: "Première Admin",
    });
    t.account(account.id);

    assert.equal(account.role, "ADMIN");
    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "account.role_changed" },
    });
    assert.equal(evt?.severity, "IMPORTANT");
    assert.deepEqual(evt?.data, { from: "MEMBER", to: "ADMIN", source: "bootstrap_env" });
  });

  test("tout autre compte reste MEMBER", async () => {
    process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL = testEmail("le-patron");

    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("quidam"),
      email: testEmail("quidam"),
      name: "Quidam",
    });
    t.account(account.id);

    assert.equal(account.role, "MEMBER");
    assert.equal(await countEvents(account.id, "account.role_changed"), 0);
  });

  test("ne re-promeut PAS un compte rétrogradé (la variable reste en place)", async () => {
    // Le piège qu'on refuse : si le bootstrap s'appliquait à chaque connexion,
    // une variable oubliée rendrait toute rétrogradation illusoire — et rien
    // n'apparaîtrait au journal, puisque « rien n'aurait changé ».
    const email = testEmail("re-promote");
    process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL = email;

    const clerkUserId = testClerkId("re-promote");
    const account = await accounts.getOrCreateForClerk({ clerkUserId, email, name: "Ada" });
    t.account(account.id);
    assert.equal(account.role, "ADMIN");

    await accounts.setRole(account.id, Role.MEMBER, { source: "test" });

    // Nouvelle résolution du compte (ce que fait chaque connexion / webhook).
    const again = await accounts.getOrCreateForClerk({ clerkUserId, email, name: "Ada" });
    assert.equal(again.role, "MEMBER", "la rétrogradation doit tenir");
  });

  test("variable absente : personne n'est promu", async () => {
    delete process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL;

    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("sans-var"),
      email: testEmail("sans-var"),
      name: "Ada",
    });
    t.account(account.id);

    assert.equal(account.role, "MEMBER");
  });
});
