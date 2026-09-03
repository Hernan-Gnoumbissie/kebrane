import { getPaymentProvider, registerPaymentProvider } from "@kebrane/core";

/**
 * Enregistrement des fournisseurs de paiement AU POINT D'USAGE (KB-13).
 *
 * On n'enregistre PAS les PSP dans `instrumentation.ts` : cela forçait
 * l'instrumentation à importer les adaptateurs (node:crypto), que Next compile
 * aussi pour le runtime Edge — d'où un échec de compilation. Et le registre posé
 * dans l'instrumentation n'était de toute façon pas fiable côté rendu.
 *
 * On importe donc les adaptateurs DYNAMIQUEMENT, par leur sous-chemin
 * (`@kebrane/core/providers/*`), uniquement ici (runtime Node), et on appelle
 * `ensurePaymentProviders()` en tête des chemins qui en ont besoin : le checkout,
 * les webhooks, et l'affichage du bouton de paiement. Idempotent et bon marché.
 */
export const PAYDUNYA = "paydunya";
export const FAPSHI = "fapshi";

let registered = false;

export async function ensurePaymentProviders(): Promise<void> {
  if (registered) return;
  const [{ payDunyaFromEnv }, { fapshiFromEnv }] = await Promise.all([
    import("@kebrane/core/providers/paydunya"),
    import("@kebrane/core/providers/fapshi"),
  ]);
  // Chaque fabrique renvoie null si ses clés manquent : on reste alors sur le
  // filet manuel, sans planter. En v1, seul PayDunya a des clés ; Fapshi
  // s'activera tout seul le jour où ses clés seront renseignées.
  const paydunya = payDunyaFromEnv();
  if (paydunya) registerPaymentProvider(paydunya);
  const fapshi = fapshiFromEnv();
  if (fapshi) registerPaymentProvider(fapshi);
  registered = true;
}

/** Un PSP mobile money automatique est-il disponible ? (après enregistrement) */
export async function momoAvailable(): Promise<boolean> {
  await ensurePaymentProviders();
  return getPaymentProvider(PAYDUNYA) !== null;
}
