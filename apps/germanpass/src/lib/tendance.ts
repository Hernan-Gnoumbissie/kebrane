/**
 * Calcul de tendance sur une série de scores (UX-07).
 *
 * Module PUR : aucune dépendance, donc testable sans base ni Clerk — la leçon
 * de KB-39, où un test unitaire restait bloqué parce que la fonction vivait
 * dans un module qui ouvrait des connexions.
 *
 * Ce que `AdminKpiCard` apporte et qui manque à l'apprenant, c'est la tendance :
 * un chiffre nu ne dit pas si l'on progresse. Encore faut-il que la tendance
 * soit VRAIE — d'où le refus de conclure sur trop peu de sessions.
 */

export type Tendance = {
  /** Écart en points de pourcentage, arrondi. Négatif = en baisse. */
  delta: number;
  /** Nombre de sessions comparées de chaque côté — sert à formuler le libellé. */
  fenetre: number;
};

const MINIMUM_SESSIONS = 4;
const FENETRE_MAX = 5;

/**
 * Compare la moyenne des dernières sessions à celle des précédentes.
 *
 * Renvoie `null` en dessous de quatre sessions : sur deux ou trois résultats,
 * l'écart relève du hasard, et annoncer une progression qui n'existe pas est
 * exactement le genre de flatterie que le Manifeste refuse.
 *
 * La fenêtre s'adapte au volume disponible (cinq au plus, jamais plus de la
 * moitié de l'historique) pour ne pas comparer des ensembles qui se chevauchent.
 */
export function tendanceScore(history: readonly { pct: number }[]): Tendance | null {
  const n = history.length;
  if (n < MINIMUM_SESSIONS) return null;

  const fenetre = Math.min(FENETRE_MAX, Math.floor(n / 2));
  const moyenne = (xs: readonly { pct: number }[]) =>
    xs.reduce((somme, x) => somme + x.pct, 0) / xs.length;

  const recentes = history.slice(n - fenetre);
  const precedentes = history.slice(n - 2 * fenetre, n - fenetre);

  return { delta: Math.round(moyenne(recentes) - moyenne(precedentes)), fenetre };
}
