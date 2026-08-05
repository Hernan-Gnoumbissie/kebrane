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
import {
  accounts,
  access,
  events,
  entitlements,
  plans,
  AccessStatus,
  CAPABILITIES,
  PRODUCT_SLUGS,
} from "@kebrane/core";
import type { Account, Capability, Entitlement, Plan } from "@kebrane/core";
import { db } from "@/lib/db";
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

/* -------------------------------------------------------------------------- */
/*  Offres et droits (KB-13)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Offres vendables de GermanPass, lues dans le catalogue Core.
 *
 * `null` quand Core n'a pas d'avis (pont désactivé, base indisponible) : la page
 * de tarifs se rabat alors sur sa grille locale. Même principe qu'en KB-19 pour
 * la landing — mieux vaut une vitrine servie par un repli qu'une page en erreur.
 */
export async function getKebranePlans(): Promise<Plan[] | null> {
  if (!CORE_ENABLED) return null;
  try {
    const list = await plans.forProduct(GERMANPASS_SLUG);
    return list.length > 0 ? list : null;
  } catch (e) {
    warn("getKebranePlans", e);
    return null;
  }
}

/**
 * Le compte Kebrane lié est-il administrateur de la MAISON (rôle `ADMIN` de
 * KB-20) ?
 *
 * Distinct du rôle administrateur de GermanPass : administrer un produit
 * (valider des preuves, gérer des inscrits) n'est pas fixer les prix de la
 * plateforme. Cette séparation ne coûte rien tant qu'une seule personne porte
 * les deux casquettes, et devient nécessaire dès la première délégation.
 *
 * Retourne `null` quand Core n'a pas d'avis (pont désactivé, compte non lié,
 * base en erreur). Les appelants qui ÉCRIVENT doivent traiter `null` comme un
 * refus : sur un chemin qui touche à de l'argent, l'incertitude n'autorise pas.
 */
export async function isKebraneAdmin(clerkUserId: string | null): Promise<boolean | null> {
  if (!CORE_ENABLED || !clerkUserId) return null;
  try {
    const account = await accounts.findByClerkUserId(clerkUserId);
    if (!account) return null;
    return account.role === "ADMIN";
  } catch (e) {
    warn("isKebraneAdmin", e);
    return null;
  }
}

/**
 * Modifie une offre du catalogue Core depuis l'écran d'administration (KB-13).
 *
 * ⚠ Emplacement PROVISOIRE. Les offres sont un objet de plateforme, pas de
 * produit : leur écran a vocation à vivre dans `apps/admin` (KB-15). En
 * attendant, il est ici parce que c'est là que les administrateurs sont déjà, et
 * qu'un écran qui n'existe pas ne sert personne. La frontière v0.2 est
 * respectée — tout passe par `plans.upsert()`, jamais par les tables.
 *
 * Lève en cas d'échec, contrairement au reste du pont : ici l'administrateur
 * DOIT savoir que son changement de prix n'a pas été enregistré.
 */
export async function updateKebranePlan(input: {
  slug: string;
  name: string;
  description?: string;
  priceAmount: number;
  durationDays: number;
  capabilities: Capability[];
  aiBudgetMicroUsd: number;
  sortOrder?: number;
}): Promise<Plan> {
  if (!CORE_ENABLED) throw new Error("Catalogue indisponible : KEBRANE_DATABASE_URL absent.");
  return plans.upsert(
    { productSlug: GERMANPASS_SLUG, ...input },
    { source: "admin-germanpass" }
  );
}

/** Droits effectifs d'un utilisateur GermanPass (capacités + enveloppe IA). */
export async function getKebraneEntitlement(
  user: Pick<ProductUserView, "clerkUserId">
): Promise<Entitlement | null> {
  if (!CORE_ENABLED || !user.clerkUserId) return null;
  try {
    const account = await accounts.findByClerkUserId(user.clerkUserId);
    if (!account) return null;
    return await entitlements.forProduct(account.id, GERMANPASS_SLUG);
  } catch (e) {
    warn("getKebraneEntitlement", e);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Enveloppe IA (KB-13)                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Coût ESTIMÉ d'un appel, en micro-dollars (1 000 000 = 1 $), par type.
 *
 * Sert à réserver AVANT l'appel : refuser après avoir dépensé ne protège de
 * rien. L'écart avec le coût réel est régularisé juste après par
 * `settleKebraneAi()`, si bien qu'une estimation imparfaite ne fausse pas le
 * compteur — elle ne décale que le moment du refus.
 *
 * ⚠ Ces valeurs sont des ESTIMATIONS, pas des mesures : la base ne contenait
 * aucune correction au moment de les poser. À réviser avec
 * `pnpm --filter @kebrane/germanpass ai:cost` dès qu'il en existe.
 */
const ESTIMATED_MICRO_USD: Record<string, number> = {
  writing_eval: 25_000, // ~0,025 $
  speaking_eval: 60_000, // transcription + évaluation
  generation: 10_000,
  vision_ocr: 15_000,
  embedding: 100,
  tts: 2_000,
  stt: 6_000,
};

/** Capacité Kebrane correspondant à un type d'appel IA. */
const CAPABILITY_BY_KIND: Record<string, Capability | undefined> = {
  writing_eval: CAPABILITIES.CORRECTION_WRITING,
  speaking_eval: CAPABILITIES.CORRECTION_SPEAKING,
  vision_ocr: CAPABILITIES.CORRECTION_WRITING, // OCR d'une copie manuscrite à corriger
};

export function estimatedMicroUsd(kind: string): number {
  return ESTIMATED_MICRO_USD[kind] ?? 5_000;
}

/**
 * Le refus fondé sur l'enveloppe IA est-il OPPOSABLE ?
 *
 * Par défaut NON — mode observation, comme l'a été le gating d'accès (KB-08).
 * Motif : les coûts ci-dessus ne sont pas mesurés. Bloquer un membre payant sur
 * la foi d'une estimation serait pire que de laisser passer quelques appels de
 * trop. On journalise les dépassements, on mesure, puis on passe ce drapeau à 1.
 */
export const AI_BUDGET_ENFORCED = CORE_ENABLED && env.KEBRANE_AI_BUDGET_ENFORCE;

export interface AiReservation {
  allowed: boolean;
  reason?: "capability" | "budget";
  /** `false` = avis consultatif : l'appel a lieu quand même. */
  enforced: boolean;
  remainingMicroUsd: number;
}

/**
 * Réserve le coût estimé d'un appel IA sur l'enveloppe du membre.
 *
 * Retourne `null` quand Core n'a pas d'avis (pont désactivé, compte non lié,
 * type d'appel sans capacité associée, Core en erreur) : l'appel a lieu, la
 * logique métier de GermanPass fait foi.
 */
export async function reserveKebraneAi(input: {
  userId: string | null;
  kind: string;
}): Promise<AiReservation | null> {
  if (!CORE_ENABLED || !input.userId) return null;
  const capability = CAPABILITY_BY_KIND[input.kind];
  if (!capability) return null; // embeddings, TTS… : pas de capacité vendue

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { clerkUserId: true },
    });
    if (!user?.clerkUserId) return null;
    const account = await accounts.findByClerkUserId(user.clerkUserId);
    if (!account) return null;

    const verdict = await entitlements.reserveAi({
      accountId: account.id,
      productSlug: GERMANPASS_SLUG,
      capability,
      estimatedMicroUsd: estimatedMicroUsd(input.kind),
    });

    return { ...verdict, enforced: AI_BUDGET_ENFORCED };
  } catch (e) {
    warn("reserveKebraneAi", e);
    return null;
  }
}

/**
 * Régularise l'écart entre coût estimé et coût réel, une fois l'appel terminé.
 * Silencieux : une régularisation manquée décale le compteur, elle ne doit pas
 * faire échouer une correction déjà rendue au membre.
 */
export async function settleKebraneAi(input: {
  userId: string | null;
  kind: string;
  actualMicroUsd: number;
}): Promise<void> {
  if (!CORE_ENABLED || !input.userId) return;
  if (!CAPABILITY_BY_KIND[input.kind]) return;

  const delta = input.actualMicroUsd - estimatedMicroUsd(input.kind);
  if (delta === 0) return;

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { clerkUserId: true },
    });
    if (!user?.clerkUserId) return;
    const account = await accounts.findByClerkUserId(user.clerkUserId);
    if (!account) return;
    await entitlements.settleAi(account.id, GERMANPASS_SLUG, delta);
  } catch (e) {
    warn("settleKebraneAi", e);
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
