// @kebrane/core — catalogue des offres (KB-13).
//
// Le registre ci-dessous est le SEED, pas la vérité : une fois semé, c'est la
// base qui fait foi, et l'administrateur en fixe prix et composition (KB-15).
// Le registre sert à démarrer un environnement neuf et à documenter l'intention.
import { db } from "@kebrane/db";
import type { Account, Plan, Product } from "@kebrane/db";
import { ProductStatus, Role } from "@kebrane/db";
import { CAPABILITIES, isKnownCapability, type Capability } from "./capabilities";
import { events, products } from "./index";

export type { Plan } from "@kebrane/db";

export interface PlanDefinition {
  productSlug: string;
  slug: string;
  name: string;
  description?: string;
  /** Prix en plus petite unité de la devise (XAF : 1 = 1 F). */
  priceAmount: number;
  currency?: string;
  durationDays: number;
  capabilities: readonly Capability[];
  /** Enveloppe IA en micro-dollars (1 000 000 = 1 $). */
  aiBudgetMicroUsd: number;
  sortOrder?: number;
}

/** Tout ce qu'une offre payante inclut aujourd'hui. */
const OFFRE_COMPLETE = [
  CAPABILITIES.LESSON_READ,
  CAPABILITIES.EXAM_RUN,
  CAPABILITIES.PROGRESS_VIEW,
  CAPABILITIES.CORRECTION_WRITING,
  CAPABILITIES.CORRECTION_SPEAKING,
] as const;

/**
 * Grille GermanPass, reprise telle quelle de `apps/germanpass/src/lib/pricing.ts`.
 *
 * Les prix ne sont **pas** relevés au titre de l'IA : à ~0,02 $ la correction
 * écrite, une enveloppe de 40 coûte ~0,80 $, soit 6 % d'un Intensif à 8 000 F.
 * Le plafond protège de l'abus, pas de l'usage normal — d'où des enveloppes
 * volontairement généreuses.
 *
 * Les enveloppes sont exprimées en micro-dollars mais pensées en corrections :
 * 10 / 40 / 120 / 500 écrites, à 0,02 $ pièce.
 */
export const PLAN_REGISTRY: PlanDefinition[] = [
  {
    productSlug: "germanpass",
    slug: "decouverte",
    name: "Découverte",
    description: "Idéal pour essayer la plateforme.",
    priceAmount: 2_500,
    durationDays: 7,
    capabilities: OFFRE_COMPLETE,
    aiBudgetMicroUsd: 200_000, // ~10 corrections écrites
    sortOrder: 1,
  },
  {
    productSlug: "germanpass",
    slug: "intensif",
    name: "Intensif",
    description: "Préparation rapprochée de l'examen.",
    priceAmount: 8_000,
    durationDays: 30,
    capabilities: OFFRE_COMPLETE,
    aiBudgetMicroUsd: 800_000, // ~40 corrections écrites
    sortOrder: 2,
  },
  {
    productSlug: "germanpass",
    slug: "trimestre",
    name: "Trimestre",
    description: "Progression complète sur un niveau.",
    priceAmount: 20_000,
    durationDays: 90,
    capabilities: OFFRE_COMPLETE,
    aiBudgetMicroUsd: 2_400_000, // ~120 corrections écrites
    sortOrder: 3,
  },
  {
    productSlug: "germanpass",
    slug: "annee",
    name: "Année",
    description: "Parcours A1 → C2 sans interruption.",
    priceAmount: 60_000,
    durationDays: 365,
    capabilities: OFFRE_COMPLETE,
    aiBudgetMicroUsd: 10_000_000, // ~500 corrections écrites
    sortOrder: 4,
  },
];

/** Champs qu'un administrateur peut modifier sur une offre (KB-34). */
export interface PlanUpdate {
  name?: string;
  description?: string | null;
  /** Prix en plus petite unité de la devise (XAF : 1 = 1 F). */
  priceAmount?: number;
  currency?: string;
  durationDays?: number;
  capabilities?: readonly Capability[];
  aiBudgetMicroUsd?: number;
  sortOrder?: number;
  /** Une offre désactivée disparaît de la vente sans perdre son historique. */
  active?: boolean;
}

/** Une entrée de la grille publique : un produit et ses offres actives. */
export interface PlanCatalogueEntry {
  product: Product;
  plans: Plan[];
}

/**
 * Contrôles communs à `upsert` et `update`.
 *
 * Factorisés parce qu'ils protègent d'erreurs qui coûtent de l'argent : une
 * offre à prix négatif, une durée nulle qui ouvre un accès déjà expiré, une
 * capacité mal orthographiée qui ne donne rien. Le seed comme l'écran
 * d'administration doivent s'y heurter de la même façon.
 */
function verifierOffre(
  slug: string,
  valeurs: {
    priceAmount?: number;
    durationDays?: number;
    aiBudgetMicroUsd?: number;
    capabilities?: readonly string[];
  }
): void {
  if (valeurs.capabilities) {
    for (const key of valeurs.capabilities) {
      if (!isKnownCapability(key)) {
        throw new Error(`Capacité inconnue dans l'offre ${slug} : ${key}`);
      }
    }
  }
  if (valeurs.priceAmount !== undefined) {
    if (valeurs.priceAmount < 0 || !Number.isInteger(valeurs.priceAmount)) {
      throw new Error("Le prix doit être un entier positif ou nul.");
    }
  }
  if (valeurs.durationDays !== undefined && valeurs.durationDays <= 0) {
    throw new Error("La durée doit être strictement positive.");
  }
  if (valeurs.aiBudgetMicroUsd !== undefined) {
    if (valeurs.aiBudgetMicroUsd < 0 || !Number.isInteger(valeurs.aiBudgetMicroUsd)) {
      throw new Error("L'enveloppe IA doit être un entier positif ou nul.");
    }
  }
}

/** Photo d'une offre telle qu'elle apparaît au journal. */
function instantane(plan: Plan) {
  return {
    name: plan.name,
    price: plan.priceAmount,
    currency: plan.currency,
    days: plan.durationDays,
    ai: plan.aiBudgetMicroUsd,
    active: plan.active,
    sortOrder: plan.sortOrder,
    capabilities: plan.capabilities,
  };
}

export const plans = {
  /** Offres vendables d'un produit, dans l'ordre d'affichage. */
  async forProduct(productSlug: string): Promise<Plan[]> {
    const product = await products.bySlug(productSlug);
    if (!product) return [];
    return db.plan.findMany({
      where: { productId: product.id, active: true },
      orderBy: { sortOrder: "asc" },
    });
  },

  async bySlug(productSlug: string, planSlug: string): Promise<Plan | null> {
    const product = await products.bySlug(productSlug);
    if (!product) return null;
    return db.plan.findUnique({
      where: { productId_slug: { productId: product.id, slug: planSlug } },
    });
  },

  /**
   * Déclare/actualise une offre. Idempotent par (produit, slug).
   * `source` distingue le seed, l'écran d'administration et les tests — sans
   * quoi toutes les lignes du journal se ressembleraient.
   */
  async upsert(definition: PlanDefinition, options: { source?: string } = {}): Promise<Plan> {
    const product = await products.bySlug(definition.productSlug);
    if (!product) throw new Error(`Produit inconnu au registre : ${definition.productSlug}`);

    // Une offre ne peut vendre que des capacités qui EXISTENT. Sans ce contrôle,
    // une faute de frappe produirait une offre qui ne donne rien, et le membre
    // s'en apercevrait avant nous.
    verifierOffre(definition.slug, definition);

    const data = {
      name: definition.name,
      description: definition.description ?? null,
      priceAmount: definition.priceAmount,
      currency: definition.currency ?? "XAF",
      durationDays: definition.durationDays,
      capabilities: [...definition.capabilities],
      aiBudgetMicroUsd: definition.aiBudgetMicroUsd,
      sortOrder: definition.sortOrder ?? 0,
    };

    const before = await db.plan.findUnique({
      where: { productId_slug: { productId: product.id, slug: definition.slug } },
    });

    const saved = await db.plan.upsert({
      where: { productId_slug: { productId: product.id, slug: definition.slug } },
      update: data,
      create: { productId: product.id, slug: definition.slug, ...data },
    });

    // Toucher à un prix, c'est toucher à de l'argent : ça se trace. Le journal
    // doit permettre de répondre à « qui a changé le prix de l'Intensif, et
    // quand ». Idempotent : un seed rejoué à l'identique n'écrit rien au journal.
    const changed =
      !before ||
      before.priceAmount !== saved.priceAmount ||
      before.durationDays !== saved.durationDays ||
      before.aiBudgetMicroUsd !== saved.aiBudgetMicroUsd ||
      before.active !== saved.active ||
      before.capabilities.join(",") !== saved.capabilities.join(",");

    if (changed) {
      await events.log({
        type: before ? "plan.changed" : "plan.created",
        severity: "IMPORTANT",
        productId: product.id,
        data: {
          plan: saved.slug,
          source: options.source ?? "service",
          ...(before
            ? {
                from: {
                  price: before.priceAmount,
                  days: before.durationDays,
                  ai: before.aiBudgetMicroUsd,
                  active: before.active,
                  capabilities: before.capabilities,
                },
              }
            : {}),
          to: {
            price: saved.priceAmount,
            days: saved.durationDays,
            ai: saved.aiBudgetMicroUsd,
            active: saved.active,
            capabilities: saved.capabilities,
          },
        },
      });
    }

    return saved;
  },

  /**
   * TOUTES les offres d'un produit, actives ou non — vue de l'administration.
   *
   * Distincte de `forProduct`, qui ne rend que le vendable : un écran de
   * gestion doit voir ce qu'il a désactivé, sinon une offre retirée devient
   * irrécupérable depuis l'interface.
   */
  async allForProduct(productSlug: string): Promise<Plan[]> {
    const product = await products.bySlug(productSlug);
    if (!product) return [];
    return db.plan.findMany({
      where: { productId: product.id },
      orderBy: [{ sortOrder: "asc" }, { priceAmount: "asc" }],
    });
  },

  /**
   * Grille publique : chaque produit vendable avec ses offres actives (KB-34).
   *
   * Rendue en UNE lecture par table plutôt qu'en une requête par produit : la
   * page `/tarifs` est publique et non mise en cache (les prix doivent refléter
   * l'administration sans redéploiement), donc son coût est payé à chaque
   * visite.
   *
   * Les produits sans offre active sont écartés : afficher un produit sous un
   * titre « Tarifs » sans aucun prix pose plus de questions qu'il n'en résout.
   */
  async catalogue(): Promise<PlanCatalogueEntry[]> {
    const [produits, offres] = await Promise.all([
      db.product.findMany({
        where: { status: ProductStatus.ACTIVE },
        orderBy: { createdAt: "asc" },
      }),
      db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    ]);

    return produits
      .map((product) => ({
        product,
        plans: offres.filter((offre) => offre.productId === product.id),
      }))
      .filter((entree) => entree.plans.length > 0);
  },

  /**
   * Modifie une offre existante depuis l'administration (KB-34).
   *
   * **Réservé au rôle ADMIN**, et la vérification se fait ICI plutôt que dans
   * l'écran : une règle d'autorisation posée dans l'interface ne protège que
   * l'interface. Core reçoit l'`Account` de l'auteur au lieu d'aller le
   * chercher — il n'a pas de notion de session, et c'est très bien ainsi : la
   * frontière v0.2 veut que l'authentification reste à la porte, pas dans le
   * domaine.
   *
   * L'auteur est enregistré au journal (`accountId`) : « qui a changé le prix
   * de l'Intensif, et quand » doit avoir une réponse, et c'est la raison pour
   * laquelle les comptes d'administration sont nominatifs (KB-20).
   *
   * Idempotent : une modification qui ne change rien n'écrit pas au journal.
   */
  async update(
    productSlug: string,
    planSlug: string,
    patch: PlanUpdate,
    context: { actor: Account; source?: string }
  ): Promise<Plan> {
    if (context.actor.role !== Role.ADMIN) {
      throw new Error("FORBIDDEN : seul un administrateur peut modifier une offre.");
    }

    const product = await products.bySlug(productSlug);
    if (!product) throw new Error(`Produit inconnu au registre : ${productSlug}`);

    const before = await db.plan.findUnique({
      where: { productId_slug: { productId: product.id, slug: planSlug } },
    });
    if (!before) throw new Error(`Offre inconnue : ${productSlug}/${planSlug}`);

    verifierOffre(planSlug, patch);

    // Seules les clés RÉELLEMENT fournies sont écrites : un formulaire partiel
    // ne doit pas remettre à zéro les champs qu'il n'affiche pas.
    const data: PlanUpdate = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.priceAmount !== undefined) data.priceAmount = patch.priceAmount;
    if (patch.currency !== undefined) data.currency = patch.currency;
    if (patch.durationDays !== undefined) data.durationDays = patch.durationDays;
    if (patch.capabilities !== undefined) data.capabilities = [...patch.capabilities];
    if (patch.aiBudgetMicroUsd !== undefined) data.aiBudgetMicroUsd = patch.aiBudgetMicroUsd;
    if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
    if (patch.active !== undefined) data.active = patch.active;

    const saved = await db.plan.update({
      where: { id: before.id },
      data: { ...data, capabilities: data.capabilities as string[] | undefined },
    });

    const avant = instantane(before);
    const apres = instantane(saved);
    const change = JSON.stringify(avant) !== JSON.stringify(apres);

    if (change) {
      await events.log({
        type: "plan.changed",
        severity: "IMPORTANT",
        productId: product.id,
        // L'AUTEUR du changement — c'est tout l'intérêt de la trace.
        accountId: context.actor.id,
        data: {
          plan: saved.slug,
          source: context.source ?? "admin",
          actor: { id: context.actor.id, email: context.actor.email },
          from: avant,
          to: apres,
        },
      });
    }

    return saved;
  },

  /**
   * Applique le registre déclaratif. Idempotent — rejouable à chaque déploiement.
   *
   * ⚠ N'écrase QUE les offres du registre : une offre créée à la main depuis
   * l'écran d'administration n'est pas supprimée. Le seed amorce, il ne
   * gouverne pas.
   */
  async syncRegistry(): Promise<Plan[]> {
    const synced: Plan[] = [];
    for (const definition of PLAN_REGISTRY) {
      synced.push(await plans.upsert(definition, { source: "seed" }));
    }
    return synced;
  },
};
