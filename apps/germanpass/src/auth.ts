import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scheduleMarketingSequence } from "@/lib/marketing";
import { syncKebraneAccessInBackground } from "@/lib/kebrane";

/**
 * Adaptateur d'authentification Kebrane — adossé à Clerk.
 *
 * Objectif : conserver EXACTEMENT la forme retournée par l'ancien `auth()`
 * next-auth (`session.user.{id,email,name,role,sid}`) pour ne toucher ni aux
 * guards (`lib/guards.ts`), ni à `lib/active-gate.ts`, ni aux 7 consumers.
 *
 * Différences clés vs next-auth :
 *  - L'identité vient de Clerk (`clerkAuth()` -> `userId`, `sessionId`).
 *  - L'utilisateur métier est résolu via `clerkUserId` (réconciliation).
 *  - Le rôle reste lu EN BASE (source de vérité — ADR-004) ; Clerk ne fournit
 *    que l'identité.
 *  - `sid` = identifiant de session Clerk (anti-partage : session unique,
 *    maintenu par le webhook `session.created`).
 *
 * REPLI "lazy-link" : si une session Clerk est valide mais qu'aucun utilisateur
 * métier n'est encore lié (webhook non configuré, ou tout premier accès), on
 * crée/relie le compte à la volée. Ça évite la boucle /login <-> /dashboard et
 * rend le webhook non-bloquant en développement.
 */

export type KebraneRole = "STUDENT" | "ADMIN";

export interface KebraneSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: KebraneRole;
    /** id de session Clerk (anti-partage : session unique) */
    sid?: string;
  };
}

type ResolvedUser = { id: string; email: string; name: string; role: KebraneRole };

export async function auth(): Promise<KebraneSession | null> {
  const { userId: clerkUserId, sessionId } = await clerkAuth();
  if (!clerkUserId) return null;

  let user: ResolvedUser | null = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true, email: true, name: true, role: true },
  });

  // Session Clerk valide mais aucun user métier lié -> lien/creation à la volée.
  if (!user) {
    user = await linkClerkUser(clerkUserId);
  }
  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sid: sessionId ?? undefined,
    },
  };
}

/**
 * Relie l'utilisateur Clerk courant à un compte métier :
 *  - si un compte existe déjà pour cet email (migration / création antérieure),
 *    on le relie (clerkUserId) ;
 *  - sinon on crée un compte au statut PENDING (validation admin conservée) et
 *    on planifie la séquence marketing.
 * Miroir de la logique du webhook `user.created` (les deux sont idempotents
 * grâce à l'unicité de `clerkUserId`).
 */
async function linkClerkUser(clerkUserId: string): Promise<ResolvedUser | null> {
  const cu = await currentUser();
  if (!cu) return null;

  const email = (
    cu.primaryEmailAddress?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress ??
    ""
  ).toLowerCase();
  if (!email) return null;

  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0] ||
    "Nutzer";
  const googleId =
    cu.externalAccounts?.find((a) => (a.provider ?? "").includes("google"))
      ?.externalId ?? null;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.status === "DELETED" || existing.status === "SUSPENDED") return null;
    const linked = await db.user.update({
      where: { id: existing.id },
      data: {
        clerkUserId,
        googleId: existing.googleId ?? googleId,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
    // Le compte GermanPass vient d'acquérir son identité Kebrane : on crée le
    // compte Core et on y reflète l'accès produit (KB-08).
    syncKebraneAccessInBackground(linked);
    return {
      id: linked.id,
      email: linked.email,
      name: linked.name,
      role: linked.role,
    };
  }

  const created = await db.user.create({
    data: {
      email,
      name,
      clerkUserId,
      googleId,
      status: "PENDING",
      emailVerifiedAt: new Date(),
    },
  });
  void scheduleMarketingSequence(created.id).catch((e) =>
    console.error("[auth/lazy-link] planification marketing échouée :", e)
  );
  syncKebraneAccessInBackground(created);
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
  };
}
