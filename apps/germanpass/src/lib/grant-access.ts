import { accounts, PaymentStatus, type Payment } from "@kebrane/core";
import { db } from "@/lib/db";
import { activateUser, ALLOWED_GRANT_DAYS, type GrantDays } from "@/lib/account";
import { getKebranePlans } from "@/lib/kebrane";

/**
 * Ouvre l'accès LOCAL GermanPass après une confirmation de paiement en ligne (KB-13).
 *
 * `billing.confirm` (Core) ouvre l'accès CÔTÉ CORE, mais GermanPass gate sur ses
 * champs locaux tant que `KEBRANE_ACCESS_ENFORCE=0`. On réplique donc ici, pour
 * l'utilisateur GermanPass correspondant, exactement l'octroi du flux manuel
 * (`activateUser`) — sans quoi un paiement en ligne confirmerait dans Core sans
 * jamais débloquer l'étudiant dans le produit.
 *
 * ⚠ À n'appeler que sur une confirmation FRAÎCHE : `billing.confirm` ne renvoie le
 * paiement que dans ce cas (rejeu → null), ce qui garantit un octroi unique même
 * si la notification du PSP arrive en double. La garde de statut ci-dessous est
 * une seconde ceinture.
 */
export async function grantLocalAccessForPayment(payment: Payment): Promise<void> {
  if (payment.status !== PaymentStatus.CONFIRMED) return;

  // Compte Core → utilisateur GermanPass (via clerkUserId, repli sur l'email).
  const account = await accounts.findById(payment.accountId);
  if (!account) {
    console.error("[grant-access] compte Core introuvable :", payment.accountId);
    return;
  }
  const user =
    (account.clerkUserId
      ? await db.user.findFirst({ where: { clerkUserId: account.clerkUserId } })
      : null) ?? (await db.user.findUnique({ where: { email: account.email } }));
  if (!user) {
    console.error("[grant-access] utilisateur GermanPass introuvable pour", account.email);
    return;
  }

  // Durée = celle de l'offre ACHETÉE (recopiée sur le paiement via son slug).
  const plans = await getKebranePlans();
  const days = plans?.find((p) => p.slug === payment.plan)?.durationDays;
  if (!days || !(ALLOWED_GRANT_DAYS as readonly number[]).includes(days)) {
    console.error("[grant-access] durée d'offre inconnue pour le plan", payment.plan);
    return;
  }

  // Octroi SYSTÈME (pas d'admin auteur) — l'origine est tracée par `reason`.
  await activateUser({
    userId: user.id,
    days: days as GrantDays,
    reason: `${payment.provider}:${payment.providerRef}`,
  });
}
