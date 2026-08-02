import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isKebraneAccessDenied } from "@/lib/kebrane";
import type { User } from "@prisma/client";

export class GuardError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Revalidation EN BASE à chaque requête sensible (pas seulement le JWT) :
 * révocation effective des comptes suspendus/expirés malgré les sessions JWT (ADR-004).
 */
async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new GuardError(401, "UNAUTHENTICATED", "Authentification requise");
  }
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "DELETED") {
    throw new GuardError(401, "UNAUTHENTICATED", "Compte introuvable");
  }
  if (user.status === "SUSPENDED") {
    throw new GuardError(403, "SUSPENDED", "Compte suspendu");
  }
  // Session unique (anti-partage) : si une connexion plus récente a eu lieu
  // ailleurs, le sid en base ne correspond plus → cette session est invalidée.
  if (user.activeSessionId && session.user.sid && user.activeSessionId !== session.user.sid) {
    throw new GuardError(401, "SESSION_REVOKED", "Votre session a été ouverte sur un autre appareil. Reconnectez-vous.");
  }
  return user;
}

/** Candidat actif : status ACTIVE + accès non expiré. */
export async function requireStudent(): Promise<User> {
  const user = await requireUser();
  if (user.role === "ADMIN") return user; // l'admin a tous les droits
  if (user.status !== "ACTIVE") {
    throw new GuardError(403, "NOT_ACTIVE", "Compte en attente de validation");
  }
  if (user.accessUntil && user.accessUntil.getTime() < Date.now()) {
    throw new GuardError(403, "EXPIRED", "Accès expiré");
  }
  // Crochet plateforme (KB-08) : l'abonnement produit est lu dans Core.
  // Consultatif tant que KEBRANE_ACCESS_ENFORCE=0 (billing = KB-13).
  if (await isKebraneAccessDenied(user)) {
    throw new GuardError(
      403,
      "NO_PRODUCT_ACCESS",
      "Aucun abonnement GermanPass actif sur votre compte Kebrane."
    );
  }
  return user;
}

/** Tout utilisateur authentifié non supprimé/suspendu (ex. page d'envoi de preuve). */
export async function requireAuthenticated(): Promise<User> {
  return requireUser();
}

/** Candidat actif disposant du parcours complet (curriculum /learn). */
export async function requireFullPlan(): Promise<User> {
  const user = await requireStudent();
  if (user.role !== "ADMIN" && user.plan !== "FULL") {
    throw new GuardError(
      403,
      "PLAN_RESTRICTED",
      "L'apprentissage est réservé au parcours complet. Contactez-nous pour changer de formule."
    );
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new GuardError(403, "FORBIDDEN", "Accès administrateur requis");
  }
  return user;
}

/** Helper pour transformer une GuardError en réponse JSON propre. */
export function guardErrorResponse(e: unknown): Response | null {
  if (e instanceof GuardError) {
    return Response.json(
      { error: { code: e.code, message: e.message } },
      { status: e.status }
    );
  }
  return null;
}
