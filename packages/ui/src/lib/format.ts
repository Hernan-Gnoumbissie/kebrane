/**
 * Formatage des montants et des durées d'offre (KB-34).
 *
 * Dans `@kebrane/ui` parce que la grille tarifaire publique (`kebrane`) et
 * l'écran de gestion des offres (`admin`) doivent afficher **le même prix de la
 * même façon**. Deux formateurs, et l'administrateur relit « 8000 XAF » là où
 * le client lit « 8 000 F CFA » — puis quelqu'un se demande si c'est le même
 * montant.
 */

/**
 * Formate un montant stocké dans la PLUS PETITE unité de sa devise.
 *
 * Le franc CFA n'a pas de subdivision (1 XAF = 1), mais la base garde un entier
 * générique. On demande donc à `Intl` combien de décimales la devise possède,
 * au lieu de supposer 0 (faux pour l'euro) ou 2 (faux pour le XAF) : c'est la
 * seule façon d'afficher juste sans table de correspondance à maintenir.
 */
export function formatMontant(montant: number, devise: string, locale = "fr-FR"): string {
  try {
    const format = new Intl.NumberFormat(locale, { style: "currency", currency: devise });
    const decimales = format.resolvedOptions().maximumFractionDigits ?? 0;
    return format.format(montant / 10 ** decimales);
  } catch {
    // Devise inconnue d'`Intl` : mieux vaut un affichage brut mais exact
    // qu'une page en erreur parce qu'un code devise a été mal saisi.
    return `${new Intl.NumberFormat(locale).format(montant)} ${devise}`;
  }
}

/**
 * Parité FIXE du franc CFA BEAC avec l'euro : 1 EUR = 655,957 XAF.
 *
 * Ce n'est pas un taux de marché mais une parité **fixée par accord monétaire**,
 * inchangée depuis le passage à l'euro. D'où l'absence d'appel à un service de
 * cotation : il n'y a rien à rafraîchir, et un taux « en temps réel » serait ici
 * une source de panne pour un résultat identique.
 */
export const XAF_PAR_EUR = 655.957;

/**
 * Équivalent en euros d'un montant en francs CFA — `null` si la devise n'est
 * pas le XAF.
 *
 * Sert la diaspora, qui finance une part des abonnements depuis la zone euro
 * (c'est la raison d'être du canal `PAYPAL`) et ne sait pas convertir 8 000 F de
 * tête. Renvoie `null` plutôt qu'une approximation pour toute autre devise :
 * seule la parité XAF/EUR est fixe, convertir le reste demanderait une cotation
 * qu'on n'a pas.
 *
 * L'arrondi est à l'euro : c'est un ORDRE DE GRANDEUR d'information, pas le
 * montant facturé. Le prix qui engage reste celui en FCFA (CGV, art. 3).
 */
export function formatEquivalentEur(
  montant: number,
  devise: string,
  locale = "fr-FR"
): string | null {
  if (devise.toUpperCase() !== "XAF") return null;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(montant / XAF_PAR_EUR);
}

/**
 * Durée d'accès en français lisible.
 *
 * Les paliers usuels (7 / 30 / 90 / 365 jours) se disent « 1 semaine »,
 * « 1 mois », « 3 mois », « 1 an » — c'est ainsi qu'on achète un abonnement.
 * Tout le reste est rendu en jours plutôt qu'arrondi : annoncer « 2 mois » pour
 * 45 jours serait une approximation contractuelle.
 */
export function formatDuree(jours: number): string {
  if (jours === 7) return "1 semaine";
  if (jours === 14) return "2 semaines";
  if (jours === 30 || jours === 31) return "1 mois";
  if (jours === 365 || jours === 366) return "1 an";
  if (jours % 365 === 0) return `${jours / 365} ans`;
  if (jours % 30 === 0) return `${jours / 30} mois`;
  if (jours % 7 === 0) return `${jours / 7} semaines`;
  return `${jours} jour${jours > 1 ? "s" : ""}`;
}
