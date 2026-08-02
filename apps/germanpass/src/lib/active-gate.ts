import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isKebraneAccessDenied } from "@/lib/kebrane";

/**
 * Garde de PAGE : l'espace de travail (dashboard, entraînements, examens,
 * apprentissage) n'est accessible qu'aux comptes ACTIFS et non expirés.
 * Les comptes en attente/expirés sont redirigés vers /pricing.
 * (Les API restent protégées par requireStudent — ADR-004.)
 */
export async function requireActivePage(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "DELETED") redirect("/login");
  if (user.role === "ADMIN") return;
  const active =
    user.status === "ACTIVE" &&
    (!user.accessUntil || user.accessUntil.getTime() > Date.now());
  if (!active) redirect("/pricing?activation=1");
  // Crochet plateforme (KB-08) : abonnement produit lu dans Core.
  // Consultatif tant que KEBRANE_ACCESS_ENFORCE=0 (billing = KB-13).
  if (await isKebraneAccessDenied(user)) redirect("/pricing?activation=1");
}
