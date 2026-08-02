/**
 * Pont GermanPass -> plateforme Kebrane (KB-08).
 *
 * SEULE porte de GermanPass vers le domaine transversal : tout passe par
 * l'interface de services `@kebrane/core` (jamais les tables Core, jamais
 * `@kebrane/db`) — frontière v0.2, imposée par lint (KB-11).
 *
 * Rôles de ce module :
 *  1. résoudre le COMPTE Kebrane d'un utilisateur GermanPass (via `clerkUserId`) ;
 *  2. refléter dans Core l'accès produit (`ProductAccess`) pour que le hub
 *     affiche « Actif / En attente / À souscrire » ;
 *  3. exposer le CROCHET de contrôle d'accès consommé par `lib/guards.ts` et
 *     `lib/active-gate.ts`.
 *
 * Source de vérité : tant que `billing` n'est pas dans Core (KB-13), l'accès
 * reste piloté par GermanPass (`User.status` / `accessUntil` / `plan`) et Core
 * n'en est que le miroir. Le crochet est donc en mode OBSERVATION par défaut
 * (`KEBRANE_ACCESS_ENFORCE=0`) : il journalise les divergences sans bloquer.
 * KB-13 inversera le sens en passant le drapeau à 1.
 *
 * Robustesse : la base Core est un service distinct de la base métier. Une
 * indisponibilité de Core NE DOIT PAS casser GermanPass — toutes les fonctions
 * de ce module échouent en silence (log) et le crochet retourne `null`
 * (« pas d'avis »), ce que les gardes interprètent comme « laisser passer ».
 */
import { accounts, access, events, AccessStatus, PRODUCT_SLUGS } from "@kebrane/core";
import type { Account } from "@kebrane/core";
import { env } from "@/lib/env";

/** `product_id` de GermanPass dans le registre Kebrane. */
export const GERMANPASS_SLUG = PRODUCT_SLUGS.germanpass;

/**
 * Le pont n'est actif que si la base Core est explicitement configurée.
 * Sans `KEBRANE_DATABASE_URL`, `@kebrane/db` se rabattrait sur `DATABASE_URL`
 * — c'est-à-dire la base MÉTIER de GermanPass. On préfère désactiver.
 */
export const CORE_ENABLED = Boolean(env.KEBRANE_DATABASE_URL);

/** Le refus d'accès prononcé par Core est-il bloquant ? (KB-13) */
export const ACCESS_ENFORCED = CORE_ENABLED && env.KEBRANE_ACCESS_ENFORCE;

/** Vue minimale d'un utilisateur GermanPass suffisante pour parler à Core. */
export interface ProductUserView {
  id: string;
  email: string;
  name: string;
  clerkUserId: string | null;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "DELETED";
  plan: string | null;
  accessUntil: Date | null;
}

function warn(scope: string, e: unknown): void {
  console.warn(`[kebrane/${scope}] Core indisponible ou en erreur :`, e);
}

/**
 * Traduit l'état métier GermanPass en statut d'accès Kebrane.
 * EXPIRED -> NONE : côté hub, « à souscrire » (l'accès a été consommé).
 */
export function toKebraneAccessStatus(
  user: Pick<ProductUserView, "status" | "accessUntil">,
  now: Date = new Date()
): AccessStatus {
  switch (user.status) {
    case "ACTIVE":
      return user.accessUntil && user.accessUntil.getTime() <= now.getTime()
        ? AccessStatus.NONE
        : AccessStatus.ACTIVE;
    case "PENDING":
      return AccessStatus.PENDING;
    case "SUSPENDED":
      return AccessStatus.SUSPENDED;
    case "EXPIRED":
    case "DELETED":
      return AccessStatus.NONE;
  }
}

/**
 * Résout (ou crée) le compte Kebrane correspondant à un utilisateur GermanPass.
 * Sans `clerkUserId`, il n'y a pas d'identité commune : on ne peut rien faire.
 */
export async function resolveKebraneAccount(user: ProductUserView): Promise<Account | null> {
  if (!CORE_ENABLED || !user.clerkUserId) return null;
  try {
    return await accounts.getOrCreateForClerk({
      clerkUserId: user.clerkUserId,
      email: user.email,
      name: user.name,
    });
  } catch (e) {
    warn("resolveKebraneAccount", e);
    return null;
  }
}

/**
 * Reflète l'accès GermanPass du compte dans Core (`ProductAccess`).
 * Idempotent côté Core : n'écrit que si l'état change.
 */
export async function syncKebraneAccess(user: ProductUserView): Promise<void> {
  if (!CORE_ENABLED) return;
  try {
    const account = await resolveKebraneAccount(user);
    if (!account) return;
    await access.sync({
      accountId: account.id,
      slug: GERMANPASS_SLUG,
      status: toKebraneAccessStatus(user),
      plan: user.plan,
    });
  } catch (e) {
    warn("syncKebraneAccess", e);
  }
}

/**
 * Variante « au fil de l'eau » : à appeler après une mutation d'accès (activation,
 * suspension, expiration…) sans faire attendre la réponse HTTP.
 */
export function syncKebraneAccessInBackground(user: ProductUserView): void {
  if (!CORE_ENABLED) return;
  void syncKebraneAccess(user);
}

/** Journalise un événement métier GermanPass dans le journal Kebrane. */
export async function logKebraneEvent(input: {
  type: string;
  severity?: "INFO" | "IMPORTANT" | "ACTION_REQUIRED";
  user?: ProductUserView;
  data?: unknown;
}): Promise<void> {
  if (!CORE_ENABLED) return;
  try {
    const account = input.user ? await resolveKebraneAccount(input.user) : null;
    await events.log({
      type: input.type,
      severity: input.severity,
      accountId: account?.id,
      data: input.data,
    });
  } catch (e) {
    warn("logKebraneEvent", e);
  }
}

export interface AccessVerdict {
  allowed: boolean;
  status: AccessStatus;
  /** `false` = avis consultatif (mode observation), le produit décide seul. */
  enforced: boolean;
}

/**
 * CROCHET DE CONTRÔLE D'ACCÈS (KB-08).
 *
 * Retourne :
 *  - `null` — pas d'avis (pont désactivé, produit non enregistré, Core en
 *    erreur, compte non lié) : les gardes laissent passer, leur logique métier
 *    fait foi ;
 *  - un verdict — `allowed` selon `ProductAccess.status`. `enforced` indique si
 *    les gardes doivent le faire respecter (KB-13) ou seulement l'observer.
 */
export async function checkKebraneProductAccess(
  user: ProductUserView
): Promise<AccessVerdict | null> {
  if (!CORE_ENABLED || !user.clerkUserId) return null;
  try {
    const account = await accounts.findByClerkUserId(user.clerkUserId);
    if (!account) return null;

    const row = await access.getBySlug(account.id, GERMANPASS_SLUG);
    if (!row) return null; // produit pas encore enregistré / accès jamais reflété

    const allowed = row.status === AccessStatus.ACTIVE;
    if (!allowed && !ACCESS_ENFORCED) {
      // Mode observation : on trace la divergence pour préparer KB-13.
      void logKebraneEvent({
        type: "product_access.denied_observed",
        user,
        data: { product: GERMANPASS_SLUG, coreStatus: row.status, productStatus: user.status },
      });
    }
    return { allowed, status: row.status, enforced: ACCESS_ENFORCED };
  } catch (e) {
    warn("checkKebraneProductAccess", e);
    return null;
  }
}

/** Vrai uniquement si Core a un avis ET que cet avis est un refus opposable. */
export async function isKebraneAccessDenied(user: ProductUserView): Promise<boolean> {
  const verdict = await checkKebraneProductAccess(user);
  return Boolean(verdict && verdict.enforced && !verdict.allowed);
}
