// @kebrane/auth/server — session Kebrane côté serveur, adossée à Clerk.
// Résout la session Clerk vers un COMPTE Core (source de vérité métier).
// Repli « lazy-link » : si le compte n'existe pas encore, on le crée/relie à la volée.
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
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
