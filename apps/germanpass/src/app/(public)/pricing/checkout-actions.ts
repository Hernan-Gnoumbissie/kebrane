"use server";

/**
 * Point d'entrée du paiement automatique (KB-13, paywall).
 *
 * Une offre → une facture PayDunya → redirection vers la page de paiement
 * hébergée. L'ACCÈS N'EST PAS ouvert ici : `billing.createCollection` persiste
 * une ligne EN ATTENTE ; c'est l'IPN (`/api/webhooks/paydunya`) qui, seul,
 * confirmera et ouvrira l'accès. Un paiement demandé n'est pas un paiement reçu.
 *
 * Robustesse assumée : si le PSP n'est pas configuré, si l'utilisateur n'est pas
 * connecté, ou si le fournisseur ne renvoie pas de page de paiement, on retombe
 * proprement sur le parcours manuel (preuve + validation admin) plutôt que de
 * planter — le filet doit toujours exister.
 */
import { redirect } from "next/navigation";
import { billing, PaymentChannel, getPaymentProvider } from "@kebrane/core";
import { GuardError, requireAuthenticated } from "@/lib/guards";
import { GERMANPASS_SLUG, getKebranePlans, resolveKebraneAccount } from "@/lib/kebrane";

const PROVIDER = "paydunya";

export async function startMomoCheckout(formData: FormData): Promise<void> {
  const planSlug = String(formData.get("planSlug") ?? "").trim();
  if (!planSlug) redirect("/pricing");

  // PSP automatique absent (pas de clés en env) → parcours manuel.
  if (!getPaymentProvider(PROVIDER)) redirect("/account?paiement=manuel");

  // Il faut un compte pour rattacher le paiement. Non connecté → login, retour /pricing.
  let user;
  try {
    user = await requireAuthenticated();
  } catch (e) {
    if (e instanceof GuardError && e.status === 401) {
      redirect("/login?redirect_url=/pricing");
    }
    throw e;
  }

  const account = await resolveKebraneAccount(user);
  if (!account) redirect("/account?paiement=indisponible");

  // Le prix qui engage est celui du catalogue Core au moment de l'achat.
  const plans = await getKebranePlans();
  const plan = plans?.find((p) => p.slug === planSlug);
  if (!plan) redirect("/pricing");

  const payment = await billing.createCollection(
    {
      accountId: account.id,
      productSlug: GERMANPASS_SLUG,
      plan: planSlug,
      amount: plan.priceAmount,
      currency: "XAF",
      channel: PaymentChannel.MTN_MOMO,
    },
    PROVIDER,
  );

  const url = (payment.metadata as { redirectUrl?: string } | null)?.redirectUrl;
  // Pas de page de paiement renvoyée : on n'invente rien, on renvoie au manuel.
  if (!url) redirect("/account?paiement=indisponible");

  redirect(url);
}
