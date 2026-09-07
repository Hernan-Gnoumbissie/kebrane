import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts, access, products, privacy, ProductStatus, Role } from "../src/index";
import { billing, PaymentChannel } from "../src/billing";
import { db, tracker, testEmail, testClerkId, testSlug, countEvents } from "./helpers";

/**
 * KB-28 — droits RGPD actionnables.
 *
 * La politique de confidentialité PROMET l'export et la suppression. Ces tests
 * sont ce qui empêche la promesse de redevenir un paragraphe.
 *
 * Trois invariants, et le troisième est le moins évident :
 *  - **l'export ne fuit pas** : il ne rend que les données du demandeur ;
 *  - **effacer, c'est anonymiser** : l'identité part, la trace comptable reste ;
 *  - **effacer ne laisse pas de copie** : l'ancienne adresse ne doit survivre
 *    NULLE PART, journal compris — la journaliser reviendrait à conserver en
 *    clair exactement la donnée qu'on vient d'effacer.
 */
describe("privacy", () => {
  const t = tracker();
  after(() => t.cleanup());

  async function fixture(label: string) {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId(label),
      email: testEmail(label),
      name: "Ada",
    });
    t.account(account.id);

    const slug = testSlug(label);
    await products.upsert({ slug, name: `Produit ${label}`, status: ProductStatus.ACTIVE });
    t.product(slug);

    return { account, slug };
  }

  test("l'export rend le compte, ses accès, ses paiements et son journal", async () => {
    const { account, slug } = await fixture("export");
    await access.sync({ accountId: account.id, slug, status: "ACTIVE", plan: "mensuel" });
    await billing.createCollection({
      accountId: account.id,
      productSlug: slug,
      plan: "mensuel",
      amount: 5000,
      channel: PaymentChannel.MTN_MOMO,
      phone: "+237690000000",
    });

    const contenu = await privacy.exportAccount(account.id);
    assert.ok(contenu, "un compte existant doit produire un export");

    assert.equal(contenu.compte.email, account.email);
    assert.equal(contenu.accesProduits.length, 1);
    assert.equal(contenu.paiements.length, 1);
    assert.equal(contenu.paiements[0]!.montant, 5000);
    assert.ok(contenu.journal.length > 0, "le journal du compte est exporté");
    assert.ok(Date.parse(contenu.genereLe) > 0, "un export est daté : c'est une photo");
  });

  test("l'export ne contient QUE les données du demandeur", async () => {
    const mien = await fixture("moi");
    const autre = await fixture("autrui");
    await access.sync({
      accountId: autre.account.id,
      slug: autre.slug,
      status: "ACTIVE",
      plan: "annuel",
    });

    const contenu = await privacy.exportAccount(mien.account.id);
    assert.ok(contenu);

    assert.equal(contenu.accesProduits.length, 0, "l'accès d'autrui n'a rien à faire ici");
    const rendu = JSON.stringify(contenu);
    assert.ok(!rendu.includes(autre.account.email), "aucune adresse tierce dans l'export");
  });

  test("l'export est tracé : remettre ses données est une divulgation", async () => {
    const { account } = await fixture("trace-export");
    await privacy.exportAccount(account.id);
    assert.equal(await countEvents(account.id, "account.data_exported"), 1);
  });

  test("compte inconnu : renvoie null plutôt que d'échouer", async () => {
    assert.equal(await privacy.exportAccount("compte-qui-nexiste-pas"), null);
    assert.equal(await privacy.eraseAccount("compte-qui-nexiste-pas"), null);
  });

  test("effacer anonymise le compte sans supprimer la ligne", async () => {
    const { account } = await fixture("effacer");
    const avant = account.email;

    const efface = await privacy.eraseAccount(account.id);
    assert.ok(efface);

    assert.notEqual(efface.email, avant);
    assert.match(efface.email, /@comptes\.kebrane\.invalid$/, "TLD réservé : rien ne partira dessus");
    assert.equal(efface.name, "Compte supprimé");
    assert.equal(efface.clerkUserId, null, "l'identité de connexion est déliée");
    assert.equal(efface.lastSeenAt, null);

    const encoreLa = await db.account.findUnique({ where: { id: account.id } });
    assert.ok(encoreLa, "la ligne survit : elle porte l'historique comptable");
  });

  test("effacer retire les privilèges", async () => {
    const { account } = await fixture("privileges");
    await accounts.setRole(account.id, Role.ADMIN);

    const efface = await privacy.eraseAccount(account.id);
    assert.equal(efface?.role, Role.MEMBER, "un compte effacé ne conserve pas de pouvoir");
  });

  test("les accès partent, les paiements restent mais perdent le numéro payeur", async () => {
    const { account, slug } = await fixture("comptable");
    await access.sync({ accountId: account.id, slug, status: "ACTIVE", plan: "mensuel" });
    await billing.createCollection({
      accountId: account.id,
      productSlug: slug,
      plan: "mensuel",
      amount: 8000,
      channel: PaymentChannel.ORANGE_MONEY,
      phone: "+237690000001",
    });

    await privacy.eraseAccount(account.id);

    assert.equal(
      await db.productAccess.count({ where: { accountId: account.id } }),
      0,
      "un accès est un ÉTAT, pas une archive"
    );

    const paiements = await db.payment.findMany({ where: { accountId: account.id } });
    assert.equal(paiements.length, 1, "la trace comptable survit — la loi l'impose");
    assert.equal(paiements[0]!.amount, 8000, "le montant reste vérifiable");
    assert.equal(paiements[0]!.phone, null, "mais le numéro payeur est effacé");
  });

  test("l'ancienne adresse ne survit NULLE PART, journal compris", async () => {
    const { account } = await fixture("fuite");
    const avant = account.email;

    await privacy.eraseAccount(account.id);

    const evenements = await db.event.findMany({ where: { accountId: account.id } });
    assert.ok(evenements.length > 0, "le journal survit à l'effacement");
    const journal = JSON.stringify(evenements);
    assert.ok(
      !journal.includes(avant),
      "journaliser l'ancienne adresse conserverait la donnée qu'on vient d'effacer"
    );
  });

  test("l'effacement est tracé, et rejouer n'écrit rien de plus", async () => {
    const { account } = await fixture("idempotent");

    await privacy.eraseAccount(account.id);
    assert.equal(await countEvents(account.id, "account.erased"), 1);

    const rejoue = await privacy.eraseAccount(account.id);
    assert.ok(rejoue);
    assert.equal(
      await countEvents(account.id, "account.erased"),
      1,
      "un compte déjà effacé ne l'est pas deux fois"
    );
  });
});
