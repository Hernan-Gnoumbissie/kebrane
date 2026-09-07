// @kebrane/core — droits effectifs d'un compte sur un produit (KB-13).
//
// C'est le crochet que les produits interrogent avant d'agir : « ce compte
// peut-il lancer une correction, et lui reste-t-il de quoi la payer ? »
//
// Deux mécanismes, volontairement pas trois :
//  - des CAPACITÉS booléennes (a le droit, ou non) ;
//  - une ENVELOPPE IA en micro-dollars, décomptée à l'usage.
// Pas de moteur de quotas généralisé : un compteur suffit tant qu'une seule
// ressource est réellement rare. Construire le moteur avant le besoin est le
// meilleur moyen de le construire de travers.
import { db } from "@kebrane/db";
import { AccessStatus } from "@kebrane/db";
import {
  ESTIMATED_WRITING_CORRECTION_MICRO_USD,
  FREE_AI_BUDGET_MICRO_USD,
  FREE_AI_CORRECTION_CAPABILITY,
  FREE_AI_CORRECTIONS,
  FREE_CAPABILITIES,
  type Capability,
} from "./capabilities";
import { events, products } from "./index";

export interface Entitlement {
  /** Capacités effectives, gratuites incluses. */
  capabilities: readonly Capability[];
  /** `true` si un accès payant est en cours (statut ACTIVE et non échu). */
  paid: boolean;
  /** Fin de l'accès payant, si elle existe. */
  expiresAt: Date | null;
  aiBudgetMicroUsd: number;
  aiUsedMicroUsd: number;
  aiRemainingMicroUsd: number;
}

/** Un accès payant expiré ne vaut plus rien, même si son statut dit ACTIVE. */
function isPaidNow(
  status: AccessStatus,
  expiresAt: Date | null,
  now: Date
): boolean {
  if (status !== AccessStatus.ACTIVE) return false;
  return !expiresAt || expiresAt.getTime() > now.getTime();
}

/**
 * Garantit l'existence de la ligne d'accès — un compte gratuit n'en a pas.
 *
 * On INSÈRE, sans passer par `upsert` : avec un `update` vide, Prisma retombe
 * sur un « lis puis insère » non atomique, et deux requêtes concurrentes sur un
 * compte neuf se heurtent sur la contrainte d'unicité. Ici, le doublon dit
 * seulement qu'une autre requête a créé la ligne la première : c'est le résultat
 * voulu, pas une erreur.
 */
async function ensureAccessRow(accountId: string, productId: string): Promise<void> {
  // Cas courant : la ligne existe déjà (posée par le miroir d'accès). On le
  // vérifie d'abord, sinon l'INSERT échouerait à CHAQUE réservation et Prisma
  // journaliserait l'erreur — une fausse alerte par correction rendue.
  const existante = await db.productAccess.findUnique({
    where: { accountId_productId: { accountId, productId } },
    select: { accountId: true },
  });
  if (existante) return;

  try {
    await db.productAccess.create({
      data: { accountId, productId, status: AccessStatus.NONE, aiUsedMicroUsd: 0 },
    });
  } catch (err) {
    // Course perdue sur un compte neuf : une autre requête a créé la ligne
    // entre le SELECT et l'INSERT. C'est le résultat voulu, pas une erreur.
    if ((err as { code?: string } | null)?.code !== "P2002") throw err;
  }
}

export const entitlements = {
  /**
   * Droits effectifs d'un compte sur un produit.
   *
   * Un compte SANS ligne d'accès n'est pas un compte sans droits : il a le
   * palier gratuit. C'est le cœur du modèle freemium — les cours et les examens
   * blancs sont ouverts, et une correction est offerte pour montrer ce qu'on
   * achète.
   */
  async forProduct(accountId: string, productSlug: string, now = new Date()): Promise<Entitlement> {
    const product = await products.bySlug(productSlug);
    const row = product
      ? await db.productAccess.findUnique({
          where: { accountId_productId: { accountId, productId: product.id } },
        })
      : null;

    if (!row) {
      return {
        capabilities: FREE_CAPABILITIES,
        paid: false,
        expiresAt: null,
        aiBudgetMicroUsd: FREE_AI_BUDGET_MICRO_USD,
        aiUsedMicroUsd: 0,
        aiRemainingMicroUsd: FREE_AI_BUDGET_MICRO_USD,
      };
    }

    const paid = isPaidNow(row.status, row.expiresAt, now);
    const capabilities = paid
      ? (row.capabilities as Capability[])
      : FREE_CAPABILITIES;

    // Deux compteurs, parce que ce sont deux promesses différentes. Le premium
    // s'achète en volume : une enveloppe en micro-dollars, remise à neuf à
    // chaque achat. Le gratuit s'offre à l'unité : un compteur de corrections,
    // que rien ne réarme — ni une expiration, ni un achat. Hors accès payant on
    // lit donc le compteur, jamais l'enveloppe : sans cela, laisser expirer son
    // abonnement rendrait la correction offerte à chaque échéance.
    if (!paid) {
      const consommees = Math.min(row.freeAiCorrectionsUsed, FREE_AI_CORRECTIONS);
      return {
        capabilities,
        paid,
        expiresAt: row.expiresAt,
        aiBudgetMicroUsd: FREE_AI_BUDGET_MICRO_USD,
        aiUsedMicroUsd: consommees * ESTIMATED_WRITING_CORRECTION_MICRO_USD,
        aiRemainingMicroUsd:
          (FREE_AI_CORRECTIONS - consommees) * ESTIMATED_WRITING_CORRECTION_MICRO_USD,
      };
    }

    return {
      capabilities,
      paid,
      expiresAt: row.expiresAt,
      aiBudgetMicroUsd: row.aiBudgetMicroUsd,
      aiUsedMicroUsd: row.aiUsedMicroUsd,
      aiRemainingMicroUsd: Math.max(0, row.aiBudgetMicroUsd - row.aiUsedMicroUsd),
    };
  },

  /** Le compte a-t-il cette capacité ? (droit seul, sans regarder l'enveloppe) */
  async can(accountId: string, productSlug: string, capability: Capability): Promise<boolean> {
    const e = await entitlements.forProduct(accountId, productSlug);
    return e.capabilities.includes(capability);
  },

  /**
   * Décompte une consommation IA. **C'est le point de blocage.**
   *
   * Rendu AVANT l'appel au modèle, avec le coût estimé : refuser après avoir
   * dépensé ne protège de rien. Le coût réel est ensuite ajusté par
   * `settleAi()`.
   *
   * À l'épuisement : blocage jusqu'au renouvellement (décision PO du 4 août
   * 2026 — pas de vente de complément).
   */
  async reserveAi(input: {
    accountId: string;
    productSlug: string;
    capability: Capability;
    estimatedMicroUsd: number;
  }): Promise<{ allowed: boolean; reason?: "capability" | "budget"; remainingMicroUsd: number }> {
    const e = await entitlements.forProduct(input.accountId, input.productSlug);

    // La capacité ne change pas au cours d'une requête : un contrôle simple suffit.
    if (!e.capabilities.includes(input.capability)) {
      return { allowed: false, reason: "capability", remainingMicroUsd: e.aiRemainingMicroUsd };
    }

    const product = await products.bySlug(input.productSlug);
    if (!product) {
      return { allowed: false, reason: "capability", remainingMicroUsd: e.aiRemainingMicroUsd };
    }

    // Pré-contrôle INFORMATIF (pour le message et l'évènement), avant le débit.
    // Sur le gratuit, le coût estimé n'entre PAS dans la décision : ce qui est
    // offert est une correction, pas une somme. Un modèle plus cher ne doit pas
    // supprimer l'offerte, un modèle moins cher ne doit pas en ajouter une.
    const epuise = e.paid
      ? input.estimatedMicroUsd > e.aiRemainingMicroUsd
      : input.capability !== FREE_AI_CORRECTION_CAPABILITY || e.aiRemainingMicroUsd <= 0;
    if (epuise) {
      await events.log({
        type: "ai_budget.exhausted",
        severity: "ACTION_REQUIRED", // le membre doit agir : renouveler
        accountId: input.accountId,
        productId: product.id,
        data: {
          capability: input.capability,
          remaining: e.aiRemainingMicroUsd,
          requested: input.estimatedMicroUsd,
          paid: e.paid,
        },
      });
      return { allowed: false, reason: "budget", remainingMicroUsd: e.aiRemainingMicroUsd };
    }

    // INVARIANT : le débit doit être ATOMIQUE. Deux corrections simultanées ne
    // peuvent pas consommer deux fois la dernière unité. On garantit d'abord
    // l'existence de la ligne (un compte gratuit n'en a pas), puis on incrémente
    // par un UPDATE CONDITIONNEL — il n'a lieu que si le solde reste tenu.
    // Postgres sérialise cet UPDATE sur la ligne ; `count === 0` signale qu'une
    // requête concurrente a pris la place.
    //
    // Deux compteurs selon le palier : l'enveloppe en micro-dollars pour le
    // premium, le nombre de corrections offertes pour le gratuit.
    const budget = e.aiBudgetMicroUsd;
    await ensureAccessRow(input.accountId, product.id);
    const debit = e.paid
      ? await db.productAccess.updateMany({
          where: {
            accountId: input.accountId,
            productId: product.id,
            aiUsedMicroUsd: { lte: budget - input.estimatedMicroUsd },
          },
          data: { aiUsedMicroUsd: { increment: input.estimatedMicroUsd } },
        })
      : await db.productAccess.updateMany({
          where: {
            accountId: input.accountId,
            productId: product.id,
            freeAiCorrectionsUsed: { lt: FREE_AI_CORRECTIONS },
          },
          data: { freeAiCorrectionsUsed: { increment: 1 } },
        });
    if (debit.count === 0) {
      // Course perdue : l'enveloppe a été consommée entre la lecture et le débit.
      const fresh = await entitlements.forProduct(input.accountId, input.productSlug);
      await events.log({
        type: "ai_budget.exhausted",
        severity: "ACTION_REQUIRED",
        accountId: input.accountId,
        productId: product.id,
        data: {
          capability: input.capability,
          remaining: fresh.aiRemainingMicroUsd,
          requested: input.estimatedMicroUsd,
          paid: fresh.paid,
          race: true,
        },
      });
      return { allowed: false, reason: "budget", remainingMicroUsd: fresh.aiRemainingMicroUsd };
    }
    return {
      allowed: true,
      remainingMicroUsd: e.paid
        ? Math.max(0, budget - (e.aiUsedMicroUsd + input.estimatedMicroUsd))
        : Math.max(0, e.aiRemainingMicroUsd - ESTIMATED_WRITING_CORRECTION_MICRO_USD),
    };
  },

  /**
   * Régularise l'enveloppe PAYANTE : écart entre le coût estimé, réservé avant
   * l'appel, et le coût réel constaté après.
   *
   * Sans effet sur le palier gratuit, et c'est voulu : ce qui y a été débité est
   * une correction, pas une somme. Y appliquer un delta en micro-dollars ferait
   * dériver un compteur qui ne gouverne plus rien — et un delta négatif (appel
   * moins cher que prévu, cas banal) rendrait une correction déjà rendue. Pour
   * annuler une réservation, c'est `refundAi()`.
   */
  async settleAi(accountId: string, productSlug: string, deltaMicroUsd: number): Promise<number> {
    const product = await products.bySlug(productSlug);
    if (!product) return 0;

    const e = await entitlements.forProduct(accountId, productSlug);
    if (!e.paid) return e.aiUsedMicroUsd;

    const row = await db.productAccess.upsert({
      where: { accountId_productId: { accountId, productId: product.id } },
      update: { aiUsedMicroUsd: { increment: deltaMicroUsd } },
      create: {
        accountId,
        productId: product.id,
        status: AccessStatus.NONE,
        aiUsedMicroUsd: Math.max(0, deltaMicroUsd),
      },
    });
    return row.aiUsedMicroUsd;
  },

  /**
   * Annule une réservation dont l'appel n'a rien rendu d'exploitable
   * (invariant C — un membre ne perd jamais une correction qu'il n'a pas reçue).
   *
   * Rend l'unité effectivement débitée : la correction offerte sur le gratuit,
   * le montant réservé sur le premium. C'est pourquoi c'est une opération
   * distincte de `settleAi()` : celui-ci ne sait pas dire « rien rendu » d'un
   * « moins cher que prévu », alors que les deux produisent le même delta
   * négatif.
   */
  async refundAi(
    accountId: string,
    productSlug: string,
    estimatedMicroUsd: number
  ): Promise<void> {
    const product = await products.bySlug(productSlug);
    if (!product) return;

    const e = await entitlements.forProduct(accountId, productSlug);
    if (e.paid) {
      await entitlements.settleAi(accountId, productSlug, -estimatedMicroUsd);
      return;
    }

    // Plancher à zéro : un remboursement en double ne doit pas créditer des
    // corrections que personne n'a offertes.
    await db.productAccess.updateMany({
      where: {
        accountId,
        productId: product.id,
        freeAiCorrectionsUsed: { gt: 0 },
      },
      data: { freeAiCorrectionsUsed: { decrement: 1 } },
    });
  },
};
