import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import {
  accounts,
  plans,
  products,
  CAPABILITIES,
  ProductStatus,
  Role,
  type Account,
  type Capability,
} from "../src/index";
import { db, tracker, testEmail, testClerkId, testSlug } from "./helpers";

/**
 * KB-34 — modification d'une offre depuis l'administration.
 *
 * C'est le chemin qui fixe des PRIX : il mérite le même soin que
 * l'encaissement lui-même.
 *
 * Trois invariants :
 *  - **l'autorisation vit dans le domaine** : Core refuse un non-ADMIN, même si
 *    l'écran ne s'affiche que pour un administrateur. Une règle posée dans
 *    l'interface ne protège que l'interface ;
 *  - **on ne vend pas n'importe quoi** : capacité inconnue, prix non entier ou
 *    durée nulle sont refusés avant d'atteindre la base ;
 *  - **qui a changé le prix, et quand** doit avoir une réponse — l'auteur est
 *    au journal, et une modification qui ne change rien n'y écrit pas.
 */
describe("plans.update", () => {
  const t = tracker();
  after(() => t.cleanup());

  async function acteur(label: string, role: Role): Promise<Account> {
    const compte = await accounts.getOrCreateForClerk({
      clerkUserId: testClerkId(label),
      email: testEmail(label),
      name: "Ada",
    });
    t.account(compte.id);
    return role === Role.MEMBER ? compte : ((await accounts.setRole(compte.id, role)) ?? compte);
  }

  async function offre(label: string) {
    const slug = testSlug(label);
    await products.upsert({ slug, name: `Produit ${label}`, status: ProductStatus.ACTIVE });
    t.product(slug);

    await plans.upsert(
      {
        productSlug: slug,
        slug: "mensuel",
        name: "Mensuel",
        priceAmount: 5000,
        durationDays: 30,
        capabilities: [CAPABILITIES.LESSON_READ],
        aiBudgetMicroUsd: 200_000,
      },
      { source: "test" }
    );

    return slug;
  }

  /** Événements `plan.changed` émis pour un produit — l'assertion d'idempotence. */
  const changements = async (productSlug: string) => {
    const produit = await products.bySlug(productSlug);
    return db.event.count({ where: { productId: produit!.id, type: "plan.changed" } });
  };

  test("un non-ADMIN est refusé, même STAFF", async () => {
    const slug = await offre("role");
    const membre = await acteur("membre", Role.MEMBER);
    const staff = await acteur("staff", Role.STAFF);

    await assert.rejects(
      () => plans.update(slug, "mensuel", { priceAmount: 1 }, { actor: membre }),
      /FORBIDDEN/
    );
    await assert.rejects(
      () => plans.update(slug, "mensuel", { priceAmount: 1 }, { actor: staff }),
      /FORBIDDEN/,
      "STAFF lit la console, il ne fixe pas les prix"
    );

    const inchange = await plans.bySlug(slug, "mensuel");
    assert.equal(inchange?.priceAmount, 5000, "un refus ne doit rien écrire");
  });

  test("refuse une capacité inconnue", async () => {
    const slug = await offre("capacite");
    const admin = await acteur("admin-cap", Role.ADMIN);

    // Le cast est le SUJET du test, pas un contournement : la garde de
    // `plans.update` existe précisément pour les valeurs qui arrivent d'un
    // formulaire, là où le typage ne protège plus rien.
    const inventee = ["capacite.inventee"] as unknown as Capability[];

    await assert.rejects(
      () => plans.update(slug, "mensuel", { capabilities: inventee }, { actor: admin }),
      /Capacité inconnue/,
      "une faute de frappe produirait une offre qui ne donne rien"
    );
  });

  test("refuse un prix non entier ou négatif, et une durée nulle", async () => {
    const slug = await offre("montant");
    const admin = await acteur("admin-montant", Role.ADMIN);

    await assert.rejects(
      () => plans.update(slug, "mensuel", { priceAmount: 12.5 }, { actor: admin }),
      /entier/,
      "jamais de flottant pour de l'argent"
    );
    await assert.rejects(
      () => plans.update(slug, "mensuel", { priceAmount: -1 }, { actor: admin }),
      /entier/
    );
    await assert.rejects(
      () => plans.update(slug, "mensuel", { durationDays: 0 }, { actor: admin }),
      /durée/
    );
  });

  test("offre ou produit inconnu : échoue explicitement", async () => {
    const slug = await offre("inconnu");
    const admin = await acteur("admin-inconnu", Role.ADMIN);

    await assert.rejects(
      () => plans.update(slug, "offre-fantome", { priceAmount: 1 }, { actor: admin }),
      /Offre inconnue/
    );
    await assert.rejects(
      () => plans.update("produit-fantome", "mensuel", { priceAmount: 1 }, { actor: admin }),
      /Produit inconnu/
    );
  });

  test("un ADMIN change le prix, et le journal dit qui, quand, avant → après", async () => {
    const slug = await offre("trace");
    const admin = await acteur("admin-trace", Role.ADMIN);

    const saved = await plans.update(slug, "mensuel", { priceAmount: 7000 }, { actor: admin });
    assert.equal(saved.priceAmount, 7000);

    const produit = await products.bySlug(slug);
    const evenement = await db.event.findFirst({
      where: { productId: produit!.id, type: "plan.changed" },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(evenement, "toucher à un prix, c'est toucher à de l'argent : ça se trace");
    assert.equal(evenement.severity, "IMPORTANT");
    assert.equal(evenement.accountId, admin.id, "l'auteur, d'où l'exigence de comptes nominatifs");

    const data = evenement.data as Record<string, unknown>;
    const from = data.from as Record<string, unknown>;
    const to = data.to as Record<string, unknown>;
    assert.equal(from.price, 5000, "avant");
    assert.equal(to.price, 7000, "après");
    assert.equal((data.actor as Record<string, unknown>).email, admin.email);
  });

  test("une modification qui ne change rien n'écrit pas au journal", async () => {
    const slug = await offre("idempotent");
    const admin = await acteur("admin-idem", Role.ADMIN);

    await plans.update(slug, "mensuel", { priceAmount: 9000 }, { actor: admin });
    const apresPremier = await changements(slug);

    await plans.update(slug, "mensuel", { priceAmount: 9000 }, { actor: admin });
    assert.equal(
      await changements(slug),
      apresPremier,
      "réenregistrer un formulaire sans rien toucher ne doit pas polluer le journal"
    );
  });

  test("un patch partiel ne remet pas à zéro ce qu'il n'affiche pas", async () => {
    const slug = await offre("partiel");
    const admin = await acteur("admin-partiel", Role.ADMIN);

    const saved = await plans.update(slug, "mensuel", { priceAmount: 6000 }, { actor: admin });

    assert.equal(saved.priceAmount, 6000);
    assert.equal(saved.name, "Mensuel", "le nom n'était pas dans le patch");
    assert.equal(saved.durationDays, 30);
    assert.deepEqual(saved.capabilities, [CAPABILITIES.LESSON_READ]);
  });

  test("désactiver une offre la retire de la vente sans la supprimer", async () => {
    const slug = await offre("desactive");
    const admin = await acteur("admin-desactive", Role.ADMIN);

    await plans.update(slug, "mensuel", { active: false }, { actor: admin });

    assert.equal((await plans.forProduct(slug)).length, 0, "plus vendable");
    assert.ok(await plans.bySlug(slug, "mensuel"), "mais l'offre existe toujours");
  });
});
