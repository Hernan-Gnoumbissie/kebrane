import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts, access, products, AccessStatus, ProductStatus } from "../src/index";
import { db, tracker, testEmail, testClerkId, testSlug, countEvents } from "./helpers";

/**
 * KB-18 — `access.sync` : le miroir que les produits posent dans Core.
 *
 * Tant que `billing` n'est pas dans Core (KB-13), le produit reste la source de
 * vérité de SON accès et appelle `sync` à chaque mutation — donc très souvent,
 * et le plus souvent pour rien. D'où l'invariant central : **n'écrire et
 * n'émettre un événement que si l'état CHANGE**. Sans ça, le journal d'activité
 * se noie sous des lignes identiques et devient inexploitable.
 */
describe("access.sync", () => {
  const t = tracker();
  after(() => t.cleanup());

  /** Un compte + un produit jetables, pour un test isolé. */
  async function fixture(label: string) {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId(label),
      email: testEmail(label),
      name: "Ada",
    });
    t.account(account.id);

    const slug = testSlug(label);
    const product = await products.upsert({
      slug,
      name: `Produit ${label}`,
      status: ProductStatus.ACTIVE,
    });
    t.product(slug);

    return { account, product, slug };
  }

  test("crée l'accès et le journalise", async () => {
    const { account, product, slug } = await fixture("sync-create");

    const row = await access.sync({
      accountId: account.id,
      slug,
      status: AccessStatus.ACTIVE,
      plan: "mensuel",
    });

    assert.ok(row);
    assert.equal(row.productId, product.id);
    assert.equal(row.status, AccessStatus.ACTIVE);
    assert.equal(row.plan, "mensuel");
    assert.equal(await countEvents(account.id, "product_access.changed"), 1);
  });

  test("à état inchangé, n'écrit rien et ne journalise rien", async () => {
    const { account, slug } = await fixture("sync-idem");
    const input = { accountId: account.id, slug, status: AccessStatus.ACTIVE, plan: "mensuel" };

    const first = await access.sync(input);
    const before = first!.updatedAt;

    await access.sync(input);
    await access.sync(input);

    const after_ = await access.get(account.id, first!.productId);
    assert.deepEqual(after_!.updatedAt, before, "aucune réécriture ne doit avoir eu lieu");
    assert.equal(
      await countEvents(account.id, "product_access.changed"),
      1,
      "trois appels, un seul changement d'état, un seul événement"
    );
  });

  test("un changement de statut journalise la transition", async () => {
    const { account, slug } = await fixture("sync-change");

    await access.sync({ accountId: account.id, slug, status: AccessStatus.PENDING });
    await access.sync({ accountId: account.id, slug, status: AccessStatus.ACTIVE });

    assert.equal(await countEvents(account.id, "product_access.changed"), 2);

    const last = await db.event.findFirst({
      where: { accountId: account.id, type: "product_access.changed" },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(last!.severity, "IMPORTANT", "une activation d'accès n'est pas anodine");
    assert.deepEqual(last!.data, { from: "PENDING", to: "ACTIVE", plan: null });
  });

  test("un changement de PLAN seul est aussi un changement", async () => {
    const { account, slug } = await fixture("sync-plan");

    await access.sync({ accountId: account.id, slug, status: AccessStatus.ACTIVE, plan: "mensuel" });
    await access.sync({ accountId: account.id, slug, status: AccessStatus.ACTIVE, plan: "annuel" });

    assert.equal(await countEvents(account.id, "product_access.changed"), 2);
  });

  test("produit inconnu : ne crée rien plutôt que d'échouer", async () => {
    // Un produit peut appeler Core avant que le registre ne soit semé.
    const { account } = await fixture("sync-unknown");

    const row = await access.sync({
      accountId: account.id,
      slug: "produit-qui-nexiste-pas",
      status: AccessStatus.ACTIVE,
    });

    assert.equal(row, null);
    assert.equal(await countEvents(account.id, "product_access.changed"), 0);
  });

  test("isActive ne dit vrai que pour un accès ACTIVE", async () => {
    const { account, slug } = await fixture("is-active");

    assert.equal(await access.isActive(account.id, slug), false, "aucun accès posé");

    await access.sync({ accountId: account.id, slug, status: AccessStatus.PENDING });
    assert.equal(await access.isActive(account.id, slug), false);

    await access.sync({ accountId: account.id, slug, status: AccessStatus.ACTIVE });
    assert.equal(await access.isActive(account.id, slug), true);

    await access.sync({ accountId: account.id, slug, status: AccessStatus.SUSPENDED });
    assert.equal(await access.isActive(account.id, slug), false);
  });
});
