// @kebrane/auth/server — session Kebrane côté serveur, adossée à Clerk.
// Résout la session Clerk vers un COMPTE Core (source de vérité métier).
// Repli « lazy-link » : si le compte n'existe pas encore, on le crée/relie à la volée.
import { auth as clerkAuth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { accounts, type Account } from "@kebrane/core";

export interface KebraneSession {
  account: Account;
  /** id de session Clerk (utile pour la session unique anti-partage) */
  clerkSessionId?: string;
}

export async function getKebraneSession(): Promise<KebraneSession | null> {
  const { userId, sessionId } = await clerkAuth();
  if (!userId) return null;

  let account = await accounts.findByClerkUserId(userId);
  if (!account) {
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
      "Membre";
    account = await accounts.getOrCreateForClerk({ clerkUserId: userId, email, name });
  }

  // Indicateur « dernière connexion » (KB-15). Volontairement pas attendu : un
  // compteur ne doit pas ralentir la résolution d'une session.
  void accounts.touchLastSeen(account.id);

  return { account, clerkSessionId: sessionId ?? undefined };
}

export async function requireKebraneSession(): Promise<KebraneSession> {
  const session = await getKebraneSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/** Garde de rôle (RBAC lu côté Core). */
export async function requireRole(role: Account["role"]): Promise<KebraneSession> {
  const session = await requireKebraneSession();
  const rank = { MEMBER: 0, STAFF: 1, ADMIN: 2 } as const;
  if (rank[session.account.role] < rank[role]) throw new Error("FORBIDDEN");
  return session;
}

/** Ce qui manque à une session pour accéder à l'administration. */
export type StaffDenial = "UNAUTHENTICATED" | "FORBIDDEN" | "MFA_REQUIRED";

export interface StaffCheck {
  session: KebraneSession | null;
  denial: StaffDenial | null;
}

/**
 * Garde du personnel (KB-15) : rôle **et** double authentification.
 *
 * La 2FA est vérifiée CÔTÉ SERVEUR auprès de Clerk, pas déduite d'un jeton :
 * un contrôle d'accès qui se fie à ce que le client affirme n'est pas un
 * contrôle d'accès. Le coût est un appel à l'API Clerk par requête admin —
 * négligeable pour le volume concerné, et c'est le prix d'une garantie réelle.
 *
 * Rend un DIAGNOSTIC plutôt que de lever : l'écran doit pouvoir dire « activez
 * la 2FA » au lieu d'afficher un 403 opaque à quelqu'un qui a le bon rôle.
 */
export async function checkStaff(minimum: Account["role"] = "STAFF"): Promise<StaffCheck> {
  const session = await getKebraneSession();
  if (!session) return { session: null, denial: "UNAUTHENTICATED" };

  const rank = { MEMBER: 0, STAFF: 1, ADMIN: 2 } as const;
  if (rank[session.account.role] < rank[minimum]) {
    return { session, denial: "FORBIDDEN" };
  }

  const { userId } = await clerkAuth();
  if (!userId) return { session: null, denial: "UNAUTHENTICATED" };

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if (!user.twoFactorEnabled) return { session, denial: "MFA_REQUIRED" };
  } catch {
    // Clerk injoignable : on REFUSE. Sur une console d'administration,
    // l'indisponibilité d'un contrôle ne vaut pas autorisation.
    return { session, denial: "MFA_REQUIRED" };
  }

  return { session, denial: null };
}
