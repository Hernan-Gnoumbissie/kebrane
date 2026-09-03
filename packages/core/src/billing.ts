// @kebrane/core — module `billing` (KB-13).
//
// Décision PO du 4 août 2026 : **mobile money, MTN MoMo et Orange Money dès le
// lancement. Stripe est écarté.** Mais le module reste AGNOSTIQUE du
// fournisseur : on encaisse à travers une interface, jamais en appelant un PSP
// en dur. Changer de prestataire (KPay, Fapshi, autre) doit se réduire à
// écrire un adaptateur, sans toucher ni à Core ni aux produits.
//
// Le filet de lancement — preuve de paiement + validation admin, ce que
// GermanPass fait déjà — est lui-même un adaptateur (`manualProofProvider`).
// C'est ce qui permet d'encaisser AVANT qu'un PSP soit branché.
import { db } from "@kebrane/db";
import type { Payment } from "@kebrane/db";
import { AccessStatus, PaymentChannel, PaymentStatus } from "@kebrane/db";
import { access, events, products } from "./index";
import { plans } from "./plans";

export type { Payment } from "@kebrane/db";
export { PaymentChannel, PaymentStatus } from "@kebrane/db";

/** Demande d'encaissement, telle que la formule l'application. */
export interface CollectionRequest {
  accountId: string;
  productSlug: string;
  plan: string;
  /** Dans la plus petite unité de la devise (le XAF n'en a pas : 1 = 1 F). */
  amount: number;
  currency?: string;
  channel: PaymentChannel;
  /** Numéro payeur — donnée personnelle, jamais journalisée en clair. */
  phone?: string;
}

/** Ce qu'un fournisseur rend quand on lui demande d'encaisser. */
export interface CollectionResult {
  /** Référence CHEZ le fournisseur — porte l'idempotence avec `provider`. */
  providerRef: string;
  status: PaymentStatus;
  /** URL éventuelle vers laquelle envoyer le payeur (USSD, page hébergée…). */
  redirectUrl?: string;
  metadata?: unknown;
}

/** Ce qu'un fournisseur rend quand il notifie un changement d'état. */
export interface WebhookResult {
  providerRef: string;
  status: PaymentStatus;
  metadata?: unknown;
}

/**
 * Le contrat que doit remplir tout moyen d'encaissement.
 *
 * Volontairement minimal : demander un encaissement, et interpréter une
 * notification. Tout le reste — persistance, idempotence, ouverture de l'accès,
 * journal — est fait par `billing` et n'a donc pas à être réécrit par chaque
 * adaptateur, où les divergences finiraient par apparaître.
 */
export interface PaymentProvider {
  /** Identifiant stable, stocké sur chaque paiement : "kpay", "manual-proof"… */
  readonly name: string;
  /** Canaux réellement couverts. Sert de garde-fou avant d'encaisser. */
  readonly channels: readonly PaymentChannel[];
  createCollection(request: CollectionRequest): Promise<CollectionResult>;
  /** `null` = notification non reconnue (à ignorer, pas à faire échouer). */
  handleWebhook(payload: unknown): Promise<WebhookResult | null>;
}

/**
 * Filet de lancement : le membre paie par mobile money hors ligne et fournit une
 * preuve ; un admin valide. C'est le flux que GermanPass exploite aujourd'hui,
 * ramené derrière la même interface que les futurs PSP — de sorte que le reste
 * du système ignore lequel des deux est en service.
 */
export const manualProofProvider: PaymentProvider = {
  name: "manual-proof",
  channels: [
    PaymentChannel.MTN_MOMO,
    PaymentChannel.ORANGE_MONEY,
    PaymentChannel.PAYPAL,
    PaymentChannel.MANUAL,
  ],

  async createCollection(request) {
    // Aucun appel réseau : l'encaissement a lieu hors du système. On ouvre une
    // ligne EN ATTENTE, qu'un admin confirmera après vérification de la preuve.
    return {
      providerRef: `manual_${request.accountId}_${Date.now()}`,
      status: PaymentStatus.PENDING,
    };
  },

  async handleWebhook() {
    // Pas de webhook : la confirmation passe par `billing.confirm()`, appelé
    // depuis l'écran d'administration.
    return null;
  },
};

/** Registre des adaptateurs disponibles, par nom. */
const providers = new Map<string, PaymentProvider>([
  [manualProofProvider.name, manualProofProvider],
]);

/** Enregistre un adaptateur (KPay, Fapshi…) sans toucher au reste du module. */
export function registerPaymentProvider(provider: PaymentProvider): void {
  providers.set(provider.name, provider);
}

export function getPaymentProvider(name: string): PaymentProvider | null {
  return providers.get(name) ?? null;
}

export const billing = {
  /**
   * Demande un encaissement et enregistre la ligne correspondante.
   *
   * L'accès N'EST PAS ouvert ici : il ne l'est qu'à la confirmation. Un
   * paiement demandé n'est pas un paiement reçu — les confondre, c'est offrir
   * le produit à qui sait cliquer.
   */
  async createCollection(
    request: CollectionRequest,
    providerName: string = manualProofProvider.name
  ): Promise<Payment> {
    const provider = providers.get(providerName);
    if (!provider) throw new Error(`Fournisseur de paiement inconnu : ${providerName}`);
    if (!provider.channels.includes(request.channel)) {
      throw new Error(`${provider.name} ne couvre pas le canal ${request.channel}`);
    }
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error("Le montant doit être un entier positif (plus petite unité de la devise).");
    }

    const product = await products.bySlug(request.productSlug);
    if (!product) throw new Error(`Produit inconnu au registre : ${request.productSlug}`);

    // L'offre au catalogue, si elle existe. On RECOPIE ce qu'elle donne sur le
    // paiement : c'est cette copie qui fera foi à la confirmation, pas l'offre
    // courante. Un administrateur qui modifie un pack ne doit pas changer
    // rétroactivement ce qu'un membre a payé.
    const plan = await plans.bySlug(request.productSlug, request.plan);

    const result = await provider.createCollection(request);

    // Un fournisseur peut confirmer d'emblée. On persiste quand même EN ATTENTE
    // puis on passe par `confirm()` : sinon la garde d'idempotence de `confirm()`
    // verrait une ligne déjà confirmée, sortirait aussitôt, et n'ouvrirait
    // jamais l'accès — le membre paierait sans rien recevoir. L'ouverture de
    // l'accès doit avoir UN SEUL chemin.
    const persistedStatus =
      result.status === PaymentStatus.CONFIRMED ? PaymentStatus.PENDING : result.status;

    const payment = await db.payment.create({
      data: {
        accountId: request.accountId,
        productId: product.id,
        plan: request.plan,
        planId: plan?.id ?? null,
        capabilities: plan?.capabilities ?? [],
        aiBudgetMicroUsd: plan?.aiBudgetMicroUsd ?? 0,
        amount: request.amount,
        currency: request.currency ?? "XAF",
        provider: provider.name,
        providerRef: result.providerRef,
        channel: request.channel,
        phone: request.phone ?? null,
        status: persistedStatus,
        // On conserve l'URL de redirection éventuelle DANS la métadonnée : c'est
        // ainsi que l'appelant (le checkout) récupère la page de paiement à
        // ouvrir, et qu'un paiement inachevé pourra être repris plus tard.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (result.redirectUrl
          ? {
              ...(result.metadata && typeof result.metadata === "object"
                ? (result.metadata as Record<string, unknown>)
                : {}),
              redirectUrl: result.redirectUrl,
            }
          : (result.metadata ?? null)) as any,
      },
    });

    await events.log({
      type: "payment.requested",
      accountId: request.accountId,
      productId: product.id,
      // Ni numéro de téléphone ni charge utile : le journal est lu largement.
      data: { provider: provider.name, channel: request.channel, plan: request.plan },
    });

    if (result.status === PaymentStatus.CONFIRMED) {
      return (
        (await billing.confirm(provider.name, result.providerRef, result.metadata)) ?? payment
      );
    }
    return payment;
  },

  /**
   * Confirme un paiement et OUVRE l'accès au produit.
   *
   * **Idempotent** : c'est l'exigence centrale. Les PSP rejouent leurs webhooks.
   * Un paiement déjà confirmé n'est ni réécrit ni re-journalisé — et cette
   * méthode renvoie alors `null`. Elle ne renvoie le paiement QUE lorsqu'elle a
   * réellement effectué la confirmation : ainsi les effets de bord côté appelant
   * (p. ex. l'ouverture d'accès LOCALE du produit dans la route webhook) ne
   * s'exécutent qu'UNE fois, même si la notification arrive en double.
   */
  async confirm(
    providerName: string,
    providerRef: string,
    metadata?: unknown
  ): Promise<Payment | null> {
    const payment = await db.payment.findUnique({
      where: { provider_providerRef: { provider: providerName, providerRef } },
    });
    if (!payment) return null;
    if (payment.status === PaymentStatus.CONFIRMED) return null;

    const confirmed = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(metadata !== undefined ? { metadata: metadata as any } : {}),
      },
    });

    const product = await db.product.findUnique({ where: { id: payment.productId } });
    if (product) {
      // Ouverture de l'accès : c'est ce que le membre a acheté.
      await access.sync({
        accountId: payment.accountId,
        slug: product.slug,
        status: AccessStatus.ACTIVE,
        plan: payment.plan,
      });

      // Application de l'offre TELLE QU'ACHETÉE (recopie faite à la demande
      // d'encaissement), et non telle qu'elle est aujourd'hui au catalogue.
      const planRef = payment.planId
        ? await db.plan.findUnique({ where: { id: payment.planId } })
        : null;
      const durationDays = planRef?.durationDays ?? null;
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      await db.productAccess.update({
        where: {
          accountId_productId: { accountId: payment.accountId, productId: payment.productId },
        },
        data: {
          expiresAt,
          capabilities: payment.capabilities,
          aiBudgetMicroUsd: payment.aiBudgetMicroUsd,
          // Le compteur repart à zéro : l'enveloppe est celle de la période
          // achetée, pas un cumul depuis la création du compte.
          aiUsedMicroUsd: 0,
        },
      });
    }

    await events.log({
      type: "payment.confirmed",
      severity: "IMPORTANT",
      accountId: payment.accountId,
      productId: payment.productId,
      data: {
        provider: providerName,
        plan: payment.plan,
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    return confirmed;
  },

  /** Marque un paiement échoué. Idempotent, et n'ouvre évidemment aucun accès. */
  async fail(providerName: string, providerRef: string, metadata?: unknown): Promise<Payment | null> {
    const payment = await db.payment.findUnique({
      where: { provider_providerRef: { provider: providerName, providerRef } },
    });
    if (!payment) return null;
    // Un paiement CONFIRMÉ ne redevient pas échoué : ce serait retirer un accès
    // déjà payé sur la foi d'une notification tardive ou désordonnée.
    if (payment.status === PaymentStatus.CONFIRMED) return payment;
    if (payment.status === PaymentStatus.FAILED) return payment;

    const failed = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(metadata !== undefined ? { metadata: metadata as any } : {}),
      },
    });
    await events.log({
      type: "payment.failed",
      severity: "ACTION_REQUIRED",
      accountId: payment.accountId,
      productId: payment.productId,
      data: { provider: providerName, plan: payment.plan },
    });
    return failed;
  },

  /**
   * Point d'entrée des notifications fournisseur : délègue l'INTERPRÉTATION à
   * l'adaptateur, garde la DÉCISION ici. Une charge utile non reconnue est
   * ignorée sans erreur — un PSP notifie souvent des événements dont on n'a que
   * faire, et les traiter en échec ferait retenter indéfiniment.
   */
  async handleWebhook(providerName: string, payload: unknown): Promise<Payment | null> {
    const provider = providers.get(providerName);
    if (!provider) throw new Error(`Fournisseur de paiement inconnu : ${providerName}`);

    const result = await provider.handleWebhook(payload);
    if (!result) return null;

    if (result.status === PaymentStatus.CONFIRMED) {
      return billing.confirm(provider.name, result.providerRef, result.metadata);
    }
    if (result.status === PaymentStatus.FAILED) {
      return billing.fail(provider.name, result.providerRef, result.metadata);
    }
    return db.payment.findUnique({
      where: { provider_providerRef: { provider: provider.name, providerRef: result.providerRef } },
    });
  },

  /** Historique d'un compte — ce que le support et la page « mes paiements » lisent. */
  forAccount(accountId: string): Promise<Payment[]> {
    return db.payment.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } });
  },

  /** Paiements en attente de validation admin (filet de lancement). */
  pending(providerName: string = manualProofProvider.name): Promise<Payment[]> {
    return db.payment.findMany({
      where: { provider: providerName, status: PaymentStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });
  },
};
