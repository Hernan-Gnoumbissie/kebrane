// @kebrane/core — catalogue des offres (KB-13).
//
// Le registre ci-dessous est le SEED, pas la vérité : une fois semé, c'est la
// base qui fait foi, et l'administrateur en fixe prix et composition (KB-15).
// Le registre sert à démarrer un environnement neuf et à documenter l'intention.
import { db } from "@kebrane/db";
import type { Plan } from "@kebrane/db";
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
    description: "1 semaine d'accès — idéal pour essayer la plateforme.",
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
    description: "1 mois d'accès — préparation rapprochée de l'examen.",
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
    description: "3 mois d'accès — progression complète sur un niveau.",
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
    description: "12 mois d'accès — parcours A1 → C2 sans interruption.",
    priceAmount: 60_000,
    durationDays: 365,
    capabilities: OFFRE_COMPLETE,
    aiBudgetMicroUsd: 10_000_000, // ~500 corrections écrites
    sortOrder: 4,
  },
];

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
    for (const key of definition.capabilities) {
      if (!isKnownCapability(key)) {
        throw new Error(`Capacité inconnue dans l'offre ${definition.slug} : ${key}`);
      }
    }
    if (definition.priceAmount < 0 || !Number.isInteger(definition.priceAmount)) {
      throw new Error("Le prix doit être un entier positif ou nul.");
    }
    if (definition.durationDays <= 0) {
      throw new Error("La durée doit être strictement positive.");
    }

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
