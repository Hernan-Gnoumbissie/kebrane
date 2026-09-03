// @kebrane/core — domaine transversal Kebrane.
// SEULE porte d'accès des produits au domaine (frontière v0.2 : jamais les tables directement).
import { db } from "@kebrane/db";
import type { Account, Product, ProductAccess } from "@kebrane/db";
import { AccessStatus, ProductStatus, Role } from "@kebrane/db";
import { PRODUCT_REGISTRY } from "./registry";
import { eventDefinition } from "./events-catalog";
import { notifications } from "./notifications";

export type { Account, Product, ProductAccess } from "@kebrane/db";
export { AccessStatus, ProductStatus, Role } from "@kebrane/db";
export { PRODUCT_REGISTRY, type ProductDefinition } from "./registry";
// Capacités vendables et palier gratuit (KB-13) — le CODE dit ce qui existe.
export {
  CAPABILITIES,
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  FREE_CAPABILITIES,
  FREE_AI_BUDGET_MICRO_USD,
  MICRO_USD_PER_USD,
  ESTIMATED_WRITING_CORRECTION_MICRO_USD,
  capabilityLabel,
  estimatedWritingCorrections,
  isKnownCapability,
  type Capability,
} from "./capabilities";
// Catalogue des offres (KB-13) — la BASE dit ce qui est vendu.
export {
  plans,
  PLAN_REGISTRY,
  type PlanDefinition,
  type PlanUpdate,
  type PlanCatalogueEntry,
  type Plan,
} from "./plans";
// Droits effectifs + enveloppe IA (KB-13).
export { entitlements, type Entitlement } from "./entitlements";
// Catalogue d'événements et notifications (KB-14).
export {
  EVENT_CATALOG,
  isCatalogued,
  eventDefinition,
  type EventType,
  type EventDefinition,
  type Audience,
} from "./events-catalog";
export {
  notifications,
  consoleChannel,
  setNotificationChannel,
  getNotificationChannel,
  type NotificationChannel,
  type NotificationMessage,
} from "./notifications";
// Droits RGPD actionnables : export et effacement (KB-28).
export { privacy, type AccountExport } from "./privacy";
// Amorçage des services optionnels (KB-21).
export { bootstrapKebrane } from "./bootstrap";
// Indicateurs de pilotage (KB-15).
export {
  reporting,
  type PlatformStats,
  type AlerteRecente,
} from "./reporting";
// Module `billing` (KB-13) — encaissement agnostique du fournisseur.
export {
  billing,
  manualProofProvider,
  registerPaymentProvider,
  getPaymentProvider,
  PaymentChannel,
  PaymentStatus,
  type Payment,
  type PaymentProvider,
  type CollectionRequest,
  type CollectionResult,
  type WebhookResult,
} from "./billing";

// Adaptateurs PSP (KB-13) : PAS ré-exportés ici, à dessein. Un import statique
// depuis l'index les tirerait dans le graphe Edge (via lib/kebrane), où leurs
// builtins Node (node:crypto) ne sont pas supportés — d'où un échec de
// compilation de l'instrumentation. Ils sont exposés en SOUS-CHEMIN
// (`@kebrane/core/providers/paydunya` | `/fapshi`) et importés DYNAMIQUEMENT au
// point d'usage (cf. apps/germanpass/src/lib/payments.ts). Même principe que
// `./notifications-smtp` pour nodemailer (KB-35).

type Severity = "INFO" | "IMPORTANT" | "ACTION_REQUIRED";

/** Slugs des produits de la maison (registre KB-09). */
export const PRODUCT_SLUGS = {
  germanpass: "germanpass",
} as const;

/**
 * Email du tout premier administrateur (KB-20), lu à la CRÉATION d'un compte.
 *
 * Volontairement appliqué à la seule création, et non à chaque connexion : une
 * variable oubliée dans l'environnement re-promouvrait sinon en silence un
 * compte qu'on vient de rétrograder — une porte dérobée permanente, invisible
 * dans le journal parce que rien n'aurait « changé ».
 */
function bootstrapAdminEmail(): string | null {
  return process.env.KEBRANE_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;
}

/** Comptes Kebrane — identité unique, liée à Clerk. */
export const accounts = {
  findByClerkUserId(clerkUserId: string): Promise<Account | null> {
    return db.account.findUnique({ where: { clerkUserId } });
  },

  findByEmail(email: string): Promise<Account | null> {
    return db.account.findUnique({ where: { email: email.toLowerCase() } });
  },

  /**
   * Note le passage d'un compte (KB-15). Silencieux et non bloquant : c'est un
   * indicateur, il ne doit jamais faire échouer une requête de l'utilisateur.
   * Volontairement NON journalisé — une ligne par page vue noierait le journal.
   */
  async touchLastSeen(accountId: string): Promise<void> {
    try {
      await db.account.update({ where: { id: accountId }, data: { lastSeenAt: new Date() } });
    } catch {
      /* un indicateur manqué ne casse pas une session */
    }
  },

  /** Résout (ou crée) le compte Kebrane d'un utilisateur Clerk. Idempotent. */
  async getOrCreateForClerk(input: {
    clerkUserId: string;
    email: string;
    name: string;
  }): Promise<Account> {
    const byClerk = await db.account.findUnique({ where: { clerkUserId: input.clerkUserId } });
    if (byClerk) return byClerk;

    const email = input.email.toLowerCase();
    const byEmail = await db.account.findUnique({ where: { email } });
    if (byEmail) {
      const linked = await db.account.update({
        where: { id: byEmail.id },
        data: { clerkUserId: input.clerkUserId },
      });
      // Tracé : c'est par ce chemin qu'un compte délié (KB-17) retrouve une
      // identité, et qu'un compte migré est rattaché à Clerk.
      await events.log({
        type: "account.clerk_linked",
        severity: "IMPORTANT",
        accountId: linked.id,
        data: { from: byEmail.clerkUserId, to: input.clerkUserId },
      });
      return linked;
    }

    // Bootstrap du premier admin (KB-20) : le tout premier compte doit pouvoir
    // exister sans qu'aucun admin ne soit là pour le promouvoir.
    const isBootstrapAdmin = bootstrapAdminEmail() === email;

    const created = await db.account.create({
      data: {
        clerkUserId: input.clerkUserId,
        email,
        name: input.name,
        ...(isBootstrapAdmin ? { role: Role.ADMIN } : {}),
      },
    });
    await events.log({ type: "account.created", accountId: created.id });

    if (isBootstrapAdmin) {
      // Un privilège accordé par la configuration reste un privilège : il se
      // lit dans le journal exactement comme une promotion manuelle.
      await events.log({
        type: "account.role_changed",
        severity: "IMPORTANT",
        accountId: created.id,
        data: { from: Role.MEMBER, to: Role.ADMIN, source: "bootstrap_env" },
      });
    }
    return created;
  },

  /**
   * Délie l'identité Clerk d'un compte (événement Clerk `user.deleted`, KB-17).
   *
   * On DÉLIE au lieu de supprimer : le compte Kebrane porte l'historique métier
   * (accès produits, journal, facturation à venir), qui doit survivre à la
   * disparition de l'identité Clerk. Une réinscription avec le même email
   * repasse par `getOrCreateForClerk` et retrouve ce compte.
   *
   * Idempotent : si aucun compte n'est lié à ce `clerkUserId` (rejeu du
   * webhook), rien n'est écrit et aucun événement n'est émis.
   */
  async unlinkClerk(clerkUserId: string): Promise<Account | null> {
    const account = await db.account.findUnique({ where: { clerkUserId } });
    if (!account) return null;

    const unlinked = await db.account.update({
      where: { id: account.id },
      data: { clerkUserId: null },
    });
    await events.log({
      type: "account.clerk_unlinked",
      severity: "IMPORTANT",
      accountId: account.id,
      data: { clerkUserId },
    });
    return unlinked;
  },

  /**
   * Attribue un rôle à un compte (KB-20) — prérequis d'`admin.kebrane.com`.
   *
   * `Account.role` existait depuis KB-06 mais rien ne permettait de le changer :
   * le RBAC était lisible et inattribuable.
   *
   * Toute promotion ou rétrogradation est **tracée** en gravité IMPORTANT — un
   * changement de privilège est précisément ce qu'on veut pouvoir reconstituer
   * après coup. Idempotent : réattribuer le rôle déjà en place n'écrit rien et
   * ne journalise rien, pour que le journal ne contienne que de vrais
   * changements.
   *
   * `source` distingue l'origine (script d'exploitation, futur écran d'admin,
   * bootstrap), sans quoi toutes les lignes se ressemblent.
   */
  async setRole(
    accountId: string,
    role: Role,
    options: { source?: string } = {}
  ): Promise<Account | null> {
    const account = await db.account.findUnique({ where: { id: accountId } });
    if (!account) return null;
    if (account.role === role) return account;

    const updated = await db.account.update({ where: { id: accountId }, data: { role } });
    await events.log({
      type: "account.role_changed",
      severity: "IMPORTANT",
      accountId,
      data: { from: account.role, to: role, source: options.source ?? "service" },
    });
    return updated;
  },
};

/** Registre des produits de la maison Kebrane. */
export const products = {
  /** Tous les produits, y compris retirés — vue d'administration. */
  list(): Promise<Product[]> {
    return db.product.findMany({ orderBy: { createdAt: "asc" } });
  },
  /**
   * Produits montrables au public : tout sauf `DISABLED`.
   *
   * `DISABLED` veut dire « retiré du catalogue ». Sans ce filtre, un produit
   * retiré s'affichait quand même — en « Bientôt disponible », c'est-à-dire en
   * PROMESSE, ce qui est exactement le contraire de ce que le statut demande.
   */
  listPublic(): Promise<Product[]> {
    return db.product.findMany({
      where: { status: { not: ProductStatus.DISABLED } },
      orderBy: { createdAt: "asc" },
    });
  },
  bySlug(slug: string): Promise<Product | null> {
    return db.product.findUnique({ where: { slug } });
  },
  /** Déclare/actualise un produit dans le registre (KB-09). Idempotent par slug. */
  upsert(input: {
    slug: string;
    name: string;
    tagline?: string | null;
    accentColor?: string | null;
    url?: string | null;
    status?: ProductStatus;
  }): Promise<Product> {
    const data = {
      name: input.name,
      tagline: input.tagline ?? null,
      accentColor: input.accentColor ?? null,
      url: input.url ?? null,
      status: input.status ?? ProductStatus.COMING_SOON,
    };
    return db.product.upsert({
      where: { slug: input.slug },
      update: data,
      create: { slug: input.slug, ...data },
    });
  },

  /**
   * Applique le registre déclaratif (`PRODUCT_REGISTRY`) à la base : c'est le
   * seed du catalogue produits (KB-09). Idempotent — rejouable à volonté.
   */
  async syncRegistry(): Promise<Product[]> {
    const synced: Product[] = [];
    for (const definition of PRODUCT_REGISTRY) {
      synced.push(await products.upsert(definition));
    }
    return synced;
  },
};

/** Accès compte ↔ produit (statut/plan lus par le hub, gating lu par les produits). */
export const access = {
  forAccount(accountId: string): Promise<(ProductAccess & { product: Product })[]> {
    return db.productAccess.findMany({ where: { accountId }, include: { product: true } });
  },
  get(accountId: string, productId: string): Promise<ProductAccess | null> {
    return db.productAccess.findUnique({
      where: { accountId_productId: { accountId, productId } },
    });
  },

  /** Accès d'un compte à un produit désigné par son slug (porte d'entrée des produits). */
  async getBySlug(accountId: string, slug: string): Promise<ProductAccess | null> {
    const product = await products.bySlug(slug);
    if (!product) return null;
    return access.get(accountId, product.id);
  },

  /**
   * Reflète dans Core l'état d'accès détenu par le produit (statut + plan).
   * Tant que `billing` n'est pas dans Core (KB-13), le produit reste la source
   * de vérité de SON accès ; Core en garde le miroir pour le hub et le journal.
   * Idempotent : n'écrit (et n'émet d'événement) que si l'état change.
   */
  async sync(input: {
    accountId: string;
    slug: string;
    status: AccessStatus;
    plan?: string | null;
  }): Promise<ProductAccess | null> {
    const product = await products.bySlug(input.slug);
    if (!product) return null; // produit pas encore enregistré : rien à refléter.

    const current = await access.get(input.accountId, product.id);
    const plan = input.plan ?? null;
    if (current && current.status === input.status && current.plan === plan) return current;

    const updated = await db.productAccess.upsert({
      where: { accountId_productId: { accountId: input.accountId, productId: product.id } },
      update: { status: input.status, plan },
      create: {
        accountId: input.accountId,
        productId: product.id,
        status: input.status,
        plan,
      },
    });

    await events.log({
      type: "product_access.changed",
      severity: input.status === AccessStatus.ACTIVE ? "IMPORTANT" : "INFO",
      accountId: input.accountId,
      productId: product.id,
      data: { from: current?.status ?? null, to: input.status, plan },
    });

    return updated;
  },

  /** Le compte a-t-il un accès actif au produit ? (crochet de gating côté produit) */
  async isActive(accountId: string, slug: string): Promise<boolean> {
    const row = await access.getBySlug(accountId, slug);
    return row?.status === AccessStatus.ACTIVE;
  },
};

/** Journal d'événements à 3 gravités, adossé au catalogue (KB-14). */
export const events = {
  /**
   * Écrit un événement au journal, puis le ROUTE vers ses destinataires.
   *
   * La gravité vient du **catalogue** (`EVENT_CATALOG`) et non de l'appelant :
   * c'est une propriété du TYPE d'événement, pas du lieu d'où on l'émet. Sans
   * ça, le même événement finit journalisé en `INFO` ici et en `IMPORTANT`
   * là-bas, et le journal devient impossible à filtrer.
   *
   * Un appelant peut toutefois **affiner** la gravité quand le CONTEXTE la
   * change réellement — un accès qui s'ouvre est plus notable qu'un accès qui
   * se ferme. C'est une exception assumée, pas la règle.
   */
  async log(input: {
    type: string;
    severity?: Severity;
    accountId?: string;
    productId?: string;
    data?: unknown;
  }) {
    const definition = eventDefinition(input.type);
    if (!definition && process.env.NODE_ENV !== "production") {
      // Un type hors catalogue ne serait ni routé ni documenté : on le signale
      // au développement plutôt que de le laisser passer en silence.
      console.warn(`[events] type absent du catalogue : ${input.type}`);
    }
    const severity = input.severity ?? definition?.severity ?? "INFO";

    const event = await db.event.create({
      data: {
        type: input.type,
        severity,
        accountId: input.accountId,
        productId: input.productId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: input.data as any,
      },
    });

    // Effet de bord, volontairement APRÈS l'écriture et sans `await` bloquant
    // le retour : prévenir quelqu'un ne doit jamais retarder ni annuler
    // l'opération métier qui vient d'aboutir.
    void notifications.routeEvent({ type: input.type, severity, accountId: input.accountId });

    return event;
  },
};
