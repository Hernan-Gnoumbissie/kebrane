import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts, access, products, AccessStatus, ProductStatus } from "../src/index";
import {
  billing,
  manualProofProvider,
  registerPaymentProvider,
  PaymentChannel,
  PaymentStatus,
  type PaymentProvider,
} from "../src/billing";
import { db, tracker, testEmail, testClerkId, testSlug, countEvents } from "./helpers";

/**
 * KB-13 — encaissement. C'est le chemin qui ouvre l'accès payant : il mérite le
 * même soin que l'attribution des rôles.
 *
 * Trois invariants tenus ici :
 *  - **demander n'est pas recevoir** : une demande d'encaissement n'ouvre aucun
 *    accès, sinon il suffirait de cliquer pour obtenir le produit ;
 *  - **idempotence** : les PSP rejouent leurs webhooks et un admin peut cliquer
 *    deux fois — un paiement ne doit jamais être compté deux fois ;
 *  - **un paiement confirmé ne se dégrade pas** : une notification d'échec
 *    tardive ou désordonnée ne doit pas retirer un accès déjà payé.
 */
describe("billing", () => {
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

  const request = (accountId: string, slug: string) => ({
    accountId,
    productSlug: slug,
    plan: "mensuel",
    amount: 5000,
    channel: PaymentChannel.MTN_MOMO,
    phone: "+237690000000",
  });

  test("une demande d'encaissement n'ouvre AUCUN accès", async () => {
    const { account, slug } = await fixture("pending");

    const payment = await billing.createCollection(request(account.id, slug));

    assert.equal(payment.status, PaymentStatus.PENDING);
    assert.equal(payment.provider, "manual-proof");
    assert.equal(payment.currency, "XAF", "franc CFA par défaut");
    assert.equal(
      await access.isActive(account.id, slug),
      false,
      "payer n'est pas demander à payer"
    );
    assert.equal(await countEvents(account.id, "payment.requested"), 1);
    assert.equal(await countEvents(account.id, "payment.confirmed"), 0);
  });

  test("le journal ne contient ni téléphone ni charge utile", async () => {
    // Le journal est lu largement (support, admin) : il ne doit pas devenir un
    // annuaire de numéros de mobile money.
    const { account, slug } = await fixture("privacy");
    await billing.createCollection(request(account.id, slug));

    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "payment.requested" },
    });
    assert.equal(JSON.stringify(evt!.data).includes("690000000"), false);
  });

  test("la confirmation ouvre l'accès avec le bon plan", async () => {
    const { account, slug } = await fixture("confirm");
    const payment = await billing.createCollection(request(account.id, slug));

    const confirmed = await billing.confirm(payment.provider, payment.providerRef);

    assert.equal(confirmed?.status, PaymentStatus.CONFIRMED);
    assert.ok(confirmed?.confirmedAt, "la date d'encaissement est posée");
    assert.equal(await access.isActive(account.id, slug), true);

    const row = await access.getBySlug(account.id, slug);
    assert.equal(row?.plan, "mensuel");
    assert.equal(await countEvents(account.id, "payment.confirmed"), 1);
  });

  test("confirmer deux fois n'encaisse pas deux fois", async () => {
    const { account, slug } = await fixture("idem");
    const payment = await billing.createCollection(request(account.id, slug));

    const first = await billing.confirm(payment.provider, payment.providerRef);
    const second = await billing.confirm(payment.provider, payment.providerRef);
    const third = await billing.confirm(payment.provider, payment.providerRef);

    // Le rejeu renvoie `null` : c'est précisément ce qui permet à l'appelant
    // (la route webhook) de n'exécuter ses propres effets de bord qu'à la
    // confirmation réelle. Seule la première renvoie le paiement.
    assert.ok(first?.confirmedAt, "la première confirmation encaisse");
    assert.equal(second, null, "un rejeu n'encaisse pas");
    assert.equal(third, null);

    const row = await db.payment.findUnique({ where: { id: payment.id } });
    assert.deepEqual(row?.confirmedAt, first?.confirmedAt, "aucune réécriture");
    assert.equal(
      await countEvents(account.id, "payment.confirmed"),
      1,
      "trois confirmations, un seul encaissement au journal"
    );
  });

  test("un paiement confirmé ne redevient pas échoué", async () => {
    const { account, slug } = await fixture("no-downgrade");
    const payment = await billing.createCollection(request(account.id, slug));
    await billing.confirm(payment.provider, payment.providerRef);

    const after_ = await billing.fail(payment.provider, payment.providerRef);

    assert.equal(after_?.status, PaymentStatus.CONFIRMED, "l'accès payé ne se retire pas");
    assert.equal(await access.isActive(account.id, slug), true);
    assert.equal(await countEvents(account.id, "payment.failed"), 0);
  });

  test("un échec est tracé en ACTION_REQUIRED et n'ouvre rien", async () => {
    const { account, slug } = await fixture("fail");
    const payment = await billing.createCollection(request(account.id, slug));

    const failed = await billing.fail(payment.provider, payment.providerRef);

    assert.equal(failed?.status, PaymentStatus.FAILED);
    assert.equal(await access.isActive(account.id, slug), false);
    const evt = await db.event.findFirst({
      where: { accountId: account.id, type: "payment.failed" },
    });
    assert.equal(evt?.severity, "ACTION_REQUIRED");
  });

  test("refuse un montant non entier ou négatif", async () => {
    const { account, slug } = await fixture("amount");
    for (const amount of [0, -100, 12.5]) {
      await assert.rejects(
        () => billing.createCollection({ ...request(account.id, slug), amount }),
        /entier positif/,
        `montant ${amount} doit être refusé`
      );
    }
  });

  test("refuse un canal que le fournisseur ne couvre pas", async () => {
    const { account, slug } = await fixture("channel");
    const carteSeule: PaymentProvider = {
      name: "canal-inexistant",
      channels: [PaymentChannel.MANUAL],
      createCollection: async () => ({ providerRef: "x", status: PaymentStatus.PENDING }),
      handleWebhook: async () => null,
    };
    registerPaymentProvider(carteSeule);

    await assert.rejects(
      () =>
        billing.createCollection(
          { ...request(account.id, slug), channel: PaymentChannel.ORANGE_MONEY },
          carteSeule.name
        ),
      /ne couvre pas le canal/
    );
  });

  test("refuse un produit absent du registre", async () => {
    const { account } = await fixture("unknown-product");
    await assert.rejects(
      () => billing.createCollection({ ...request(account.id, "produit-fantome") }),
      /Produit inconnu/
    );
  });

  describe("adaptateur interchangeable", () => {
    test("un fournisseur qui confirme d'emblée ouvre l'accès sans webhook", async () => {
      // Simule un PSP où l'encaissement est déjà acquis au retour de l'appel.
      const instantane: PaymentProvider = {
        name: "psp-instantane",
        channels: [PaymentChannel.MTN_MOMO],
        createCollection: async () => ({
          providerRef: `ref_${Date.now()}`,
          status: PaymentStatus.CONFIRMED,
        }),
        handleWebhook: async () => null,
      };
      registerPaymentProvider(instantane);

      const { account, slug } = await fixture("instant");
      const payment = await billing.createCollection(request(account.id, slug), instantane.name);

      assert.equal(payment.status, PaymentStatus.CONFIRMED);
      assert.equal(await access.isActive(account.id, slug), true);
    });

    test("le webhook délègue l'interprétation et garde la décision", async () => {
      const psp: PaymentProvider = {
        name: "psp-webhook",
        channels: [PaymentChannel.ORANGE_MONEY],
        createCollection: async () => ({ providerRef: ref, status: PaymentStatus.PENDING }),
        handleWebhook: async (payload) => {
          const p = payload as { ref?: string; ok?: boolean };
          if (!p?.ref) return null; // notification qui ne nous concerne pas
          return {
            providerRef: p.ref,
            status: p.ok ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED,
          };
        },
      };
      const ref = `wh_${Date.now()}`;
      registerPaymentProvider(psp);

      const { account, slug } = await fixture("webhook");
      await billing.createCollection(
        { ...request(account.id, slug), channel: PaymentChannel.ORANGE_MONEY },
        psp.name
      );

      // Charge utile étrangère : ignorée, pas une erreur.
      assert.equal(await billing.handleWebhook(psp.name, { bruit: true }), null);
      assert.equal(await access.isActive(account.id, slug), false);

      const confirmed = await billing.handleWebhook(psp.name, { ref, ok: true });
      assert.equal(confirmed?.status, PaymentStatus.CONFIRMED);
      assert.equal(await access.isActive(account.id, slug), true);

      // Rejeu du webhook — le cas le plus courant en production.
      await billing.handleWebhook(psp.name, { ref, ok: true });
      assert.equal(await countEvents(account.id, "payment.confirmed"), 1);
    });
  });

  test("une référence inconnue ne crée rien plutôt que d'échouer", async () => {
    assert.equal(await billing.confirm(manualProofProvider.name, "ref-inexistante"), null);
    assert.equal(await billing.fail(manualProofProvider.name, "ref-inexistante"), null);
  });

  test("`pending` liste ce que l'admin doit valider", async () => {
    const { account, slug } = await fixture("queue");
    await billing.createCollection(request(account.id, slug));

    const queue = await billing.pending();
    assert.ok(queue.some((p) => p.accountId === account.id));
    assert.ok(queue.every((p) => p.status === PaymentStatus.PENDING));
  });

  test("l'historique du compte est rendu du plus récent au plus ancien", async () => {
    const { account, slug } = await fixture("history");
    await billing.createCollection(request(account.id, slug));
    await billing.createCollection({ ...request(account.id, slug), plan: "annuel" });

    const history = await billing.forAccount(account.id);
    assert.equal(history.length, 2);
    assert.ok(history[0]!.createdAt >= history[1]!.createdAt);
  });

  test("l'accès reste au plan du dernier paiement confirmé", async () => {
    const { account, slug } = await fixture("upgrade");
    const mensuel = await billing.createCollection(request(account.id, slug));
    await billing.confirm(mensuel.provider, mensuel.providerRef);

    const annuel = await billing.createCollection({
      ...request(account.id, slug),
      plan: "annuel",
      amount: 50000,
    });
    await billing.confirm(annuel.provider, annuel.providerRef);

    const row = await access.getBySlug(account.id, slug);
    assert.equal(row?.plan, "annuel");
    assert.equal(row?.status, AccessStatus.ACTIVE);
  });
});
