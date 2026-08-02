import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts } from "../src/index";
import { db, tracker, testEmail, testClerkId, countEvents } from "./helpers";

/**
 * KB-18 — `accounts` : la porte d'entrée de toute identité Kebrane.
 *
 * Ce qui compte ici n'est pas « ça crée un compte » mais les deux invariants
 * dont dépendent le webhook (KB-17) et le lazy-link :
 *  - **idempotence** : Clerk réessaie ses webhooks, et le lazy-link tourne à
 *    chaque requête ; rejouer ne doit ni dupliquer ni re-journaliser ;
 *  - **réconciliation par email** : c'est ce qui évite qu'un membre existant se
 *    retrouve avec deux comptes après une réinscription ou une migration.
 */
describe("accounts", () => {
  const t = tracker();
  after(() => t.cleanup());

  test("crée un compte et le journalise une seule fois", async () => {
    const email = testEmail("create");
    const clerkUserId = testClerkId("create");

    const created = await accounts.getOrCreateForClerk({
      clerkUserId,
      email,
      name: "Ada Lovelace",
    });
    t.account(created.id);

    assert.equal(created.email, email);
    assert.equal(created.clerkUserId, clerkUserId);
    assert.equal(created.role, "MEMBER", "un nouveau compte n'est jamais privilégié");
    assert.equal(await countEvents(created.id, "account.created"), 1);
  });

  test("est idempotent : rejouer ne duplique ni compte ni événement", async () => {
    const email = testEmail("idem");
    const clerkUserId = testClerkId("idem");
    const input = { clerkUserId, email, name: "Ada Lovelace" };

    const first = await accounts.getOrCreateForClerk(input);
    t.account(first.id);
    const second = await accounts.getOrCreateForClerk(input);
    const third = await accounts.getOrCreateForClerk(input);

    assert.equal(second.id, first.id);
    assert.equal(third.id, first.id);
    assert.equal(await db.account.count({ where: { email } }), 1);
    assert.equal(await countEvents(first.id, "account.created"), 1);
  });

  test("normalise l'email en minuscules", async () => {
    const email = testEmail("case");
    const created = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("case"),
      email: email.toUpperCase(),
      name: "Ada",
    });
    t.account(created.id);

    assert.equal(created.email, email);
  });

  test("relie une identité Clerk NOUVELLE à un compte existant, par email", async () => {
    // Le cas d'une réinscription après suppression Clerk, ou d'un compte migré.
    const email = testEmail("relink");
    const first = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId("relink-a"),
      email,
      name: "Ada",
    });
    t.account(first.id);

    const secondClerkId = testClerkId("relink-b");
    const linked = await accounts.getOrCreateForClerk({
      clerkUserId: secondClerkId,
      email,
      name: "Ada",
    });

    assert.equal(linked.id, first.id, "le compte historique doit être réutilisé");
    assert.equal(linked.clerkUserId, secondClerkId);
    assert.equal(await db.account.count({ where: { email } }), 1);
    assert.equal(await countEvents(first.id, "account.clerk_linked"), 1);
  });

  describe("unlinkClerk (KB-17)", () => {
    test("délie sans supprimer, et journalise", async () => {
      const email = testEmail("unlink");
      const clerkUserId = testClerkId("unlink");
      const account = await accounts.getOrCreateForClerk({ clerkUserId, email, name: "Ada" });
      t.account(account.id);

      const unlinked = await accounts.unlinkClerk(clerkUserId);

      assert.ok(unlinked, "le compte doit être retourné, pas supprimé");
      assert.equal(unlinked.id, account.id);
      assert.equal(unlinked.clerkUserId, null);
      assert.ok(
        await db.account.findUnique({ where: { id: account.id } }),
        "l'historique métier doit survivre à la disparition de l'identité Clerk"
      );
      assert.equal(await countEvents(account.id, "account.clerk_unlinked"), 1);
    });

    test("est idempotent : une identité inconnue ne journalise rien", async () => {
      const email = testEmail("unlink-twice");
      const clerkUserId = testClerkId("unlink-twice");
      const account = await accounts.getOrCreateForClerk({ clerkUserId, email, name: "Ada" });
      t.account(account.id);

      await accounts.unlinkClerk(clerkUserId);
      const again = await accounts.unlinkClerk(clerkUserId);

      assert.equal(again, null, "plus rien à délier");
      assert.equal(await countEvents(account.id, "account.clerk_unlinked"), 1);
    });
  });

  test("findByClerkUserId ne retrouve pas un compte délié", async () => {
    const clerkUserId = testClerkId("find");
    const account = await accounts.getOrCreateForClerk({
      clerkUserId,
      email: testEmail("find"),
      name: "Ada",
    });
    t.account(account.id);

    assert.ok(await accounts.findByClerkUserId(clerkUserId));
    await accounts.unlinkClerk(clerkUserId);
    assert.equal(await accounts.findByClerkUserId(clerkUserId), null);
  });
});
