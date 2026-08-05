import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import { accounts, products, ProductStatus } from "../src/index";
import { CAPABILITIES, FREE_AI_BUDGET_MICRO_USD } from "../src/capabilities";
import { plans, PLAN_REGISTRY } from "../src/plans";
import { entitlements } from "../src/entitlements";
import { billing, PaymentChannel } from "../src/billing";
import { db, tracker, testEmail, testClerkId, testSlug, countEvents } from "./helpers";

/**
 * KB-13 — droits effectifs et enveloppe IA.
 *
 * Le modèle freemium tient sur deux promesses opposées, et c'est leur
 * cohabitation qu'on vérifie ici : **tout est ouvert** (cours, examens blancs,
 * progression), **sauf l'IA**, qui est rare et se décompte.
 */
describe("entitlements", () => {
  const t = tracker();
  after(() => t.cleanup());

  async function fixture(label: string, planDef?: Partial<Parameters<typeof plans.upsert>[0]>) {
    const account = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId(label),
      email: testEmail(label),
      name: "Ada",
    });
    t.account(account.id);

    const slug = testSlug(label);
    await products.upsert({ slug, name: `Produit ${label}`, status: ProductStatus.ACTIVE });
    t.product(slug);

    const plan = await plans.upsert({
      productSlug: slug,
      slug: "intensif",
      name: "Intensif",
      priceAmount: 8_000,
      durationDays: 30,
      capabilities: [
        CAPABILITIES.LESSON_READ,
        CAPABILITIES.EXAM_RUN,
        CAPABILITIES.PROGRESS_VIEW,
        CAPABILITIES.CORRECTION_WRITING,
      ],
      aiBudgetMicroUsd: 800_000,
      ...planDef,
    });

    return { account, slug, plan };
  }

  describe("palier gratuit", () => {
    test("un compte sans aucun accès a déjà les cours, les examens et la progression", async () => {
      const { account, slug } = await fixture("free");
      const e = await entitlements.forProduct(account.id, slug);

      assert.equal(e.paid, false);
      assert.ok(e.capabilities.includes(CAPABILITIES.LESSON_READ));
      assert.ok(e.capabilities.includes(CAPABILITIES.EXAM_RUN));
      assert.ok(e.capabilities.includes(CAPABILITIES.PROGRESS_VIEW));
    });

    test("il a droit à une correction offerte, pas à zéro", async () => {
      // L'essai doit montrer ce qu'on achète : un examen sans correction ne
      // démontrerait rien.
      const { account, slug } = await fixture("free-ai");
      const e = await entitlements.forProduct(account.id, slug);

      assert.ok(e.capabilities.includes(CAPABILITIES.CORRECTION_WRITING));
      assert.equal(e.aiRemainingMicroUsd, FREE_AI_BUDGET_MICRO_USD);
    });

    test("le chat de leçon n'est PAS offert (conversation non bornée)", async () => {
      const { account, slug } = await fixture("free-chat");
      assert.equal(
        await entitlements.can(account.id, slug, CAPABILITIES.TUTOR_CHAT),
        false
      );
    });

    test("une fois l'offerte consommée, la suivante est refusée", async () => {
      const { account, slug } = await fixture("free-spent");

      const first = await entitlements.reserveAi({
        accountId: account.id,
        productSlug: slug,
        capability: CAPABILITIES.CORRECTION_WRITING,
        estimatedMicroUsd: FREE_AI_BUDGET_MICRO_USD,
      });
      assert.equal(first.allowed, true);

      const second = await entitlements.reserveAi({
        accountId: account.id,
        productSlug: slug,
        capability: CAPABILITIES.CORRECTION_WRITING,
        estimatedMicroUsd: 20_000,
      });
      assert.equal(second.allowed, false);
      assert.equal(second.reason, "budget");
      assert.equal(await countEvents(account.id, "ai_budget.exhausted"), 1);
    });
  });

  describe("après paiement", () => {
    async function acheter(label: string) {
      const { account, slug, plan } = await fixture(label);
      const payment = await billing.createCollection({
        accountId: account.id,
        productSlug: slug,
        plan: plan.slug,
        amount: plan.priceAmount,
        channel: PaymentChannel.MTN_MOMO,
      });
      await billing.confirm(payment.provider, payment.providerRef);
      return { account, slug, plan, payment };
    }

    test("l'offre achetée ouvre l'accès, son enveloppe et son échéance", async () => {
      const { account, slug } = await acheter("paid");
      const e = await entitlements.forProduct(account.id, slug);

      assert.equal(e.paid, true);
      assert.equal(e.aiBudgetMicroUsd, 800_000);
      assert.equal(e.aiRemainingMicroUsd, 800_000, "le compteur repart à zéro");
      assert.ok(e.expiresAt, "une durée d'offre pose une échéance");
      const jours = (e.expiresAt!.getTime() - Date.now()) / 86_400_000;
      assert.ok(jours > 29 && jours <= 30, `échéance à ~30 jours, obtenu ${jours.toFixed(1)}`);
    });

    test("le paiement RECOPIE l'offre — la modifier après coup ne change rien", async () => {
      // L'erreur classique : lire le pack courant au lieu de ce qui a été payé.
      const { account, slug, plan } = await acheter("snapshot");

      await plans.upsert({
        productSlug: slug,
        slug: plan.slug,
        name: "Intensif (dégradé)",
        priceAmount: 8_000,
        durationDays: 30,
        capabilities: [CAPABILITIES.LESSON_READ], // on retire tout le reste
        aiBudgetMicroUsd: 0,
      });

      const e = await entitlements.forProduct(account.id, slug);
      assert.ok(
        e.capabilities.includes(CAPABILITIES.CORRECTION_WRITING),
        "ce qui a été payé reste dû"
      );
      assert.equal(e.aiBudgetMicroUsd, 800_000);
    });

    test("un accès échu retombe au gratuit, mais la consommation reste comptée", async () => {
      const { account, slug } = await acheter("expired");
      const product = await products.bySlug(slug);

      await entitlements.reserveAi({
        accountId: account.id,
        productSlug: slug,
        capability: CAPABILITIES.CORRECTION_WRITING,
        estimatedMicroUsd: FREE_AI_BUDGET_MICRO_USD,
      });
      await db.productAccess.update({
        where: { accountId_productId: { accountId: account.id, productId: product!.id } },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const e = await entitlements.forProduct(account.id, slug);
      assert.equal(e.paid, false, "l'échéance prime sur le statut");
      assert.equal(
        e.aiRemainingMicroUsd,
        0,
        "laisser expirer ne doit pas rendre la correction offerte à nouveau"
      );
    });
  });

  describe("catalogue des offres", () => {
    test("refuse une capacité qui n'existe pas", async () => {
      const { slug } = await fixture("bad-cap");
      await assert.rejects(
        () =>
          plans.upsert({
            productSlug: slug,
            slug: "faute",
            name: "Faute de frappe",
            priceAmount: 1_000,
            durationDays: 7,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            capabilities: ["corection.writing" as any],
            aiBudgetMicroUsd: 0,
          }),
        /Capacité inconnue/
      );
    });

    test("refuse une durée nulle ou négative", async () => {
      const { slug } = await fixture("bad-duration");
      await assert.rejects(
        () =>
          plans.upsert({
            productSlug: slug,
            slug: "sans-duree",
            name: "Sans durée",
            priceAmount: 1_000,
            durationDays: 0,
            capabilities: [],
            aiBudgetMicroUsd: 0,
          }),
        /durée/
      );
    });

    test("le registre déclaratif est cohérent et rejouable", async () => {
      const first = await plans.syncRegistry();
      const second = await plans.syncRegistry();

      assert.equal(first.length, PLAN_REGISTRY.length);
      assert.deepEqual(
        second.map((p) => p.id).sort(),
        first.map((p) => p.id).sort(),
        "un déploiement ne recrée pas le catalogue"
      );

      // Cohérence commerciale : plus c'est long, plus c'est cher, plus
      // l'enveloppe est grande. Une inversion serait une faute de saisie.
      const ordre = [...PLAN_REGISTRY].sort((a, b) => a.durationDays - b.durationDays);
      for (let i = 1; i < ordre.length; i++) {
        assert.ok(
          ordre[i]!.priceAmount > ordre[i - 1]!.priceAmount,
          `${ordre[i]!.slug} doit coûter plus que ${ordre[i - 1]!.slug}`
        );
        assert.ok(
          ordre[i]!.aiBudgetMicroUsd > ordre[i - 1]!.aiBudgetMicroUsd,
          `${ordre[i]!.slug} doit inclure plus d'IA que ${ordre[i - 1]!.slug}`
        );
      }
    });
  });
});
