/**
 * « Cette réponse a-t-elle été donnée ? »
 *
 * Extrait de l'écran d'examen pour être testable : ce prédicat gouverne
 * l'avertissement affiché avant une soumission IRRÉVERSIBLE. S'il se trompe
 * dans le sens permissif, le candidat termine sa section en croyant avoir tout
 * rempli. C'est le genre de règle qu'on ne veut pas vérifier à la main.
 *
 * Module pur — aucune dépendance. Il ne doit jamais importer de composant,
 * sinon le tester ferait remonter React et tout l'arbre applicatif.
 */

/**
 * La forme d'une réponse dépend du format d'exercice : chaîne pour un QCM
 * simple, tableau pour un QCM multiple, booléen pour un vrai/faux, objet
 * clé→valeur pour un texte à trous.
 *
 * Le piège est le vide « présent » : effleurer une question produit souvent un
 * tableau ou un objet vide. Les compter comme répondues viderait le décompte
 * de son sens exactement quand il sert — au moment de soumettre.
 */
export function estRepondue(valeur: unknown): boolean {
  if (valeur === undefined || valeur === null) return false;
  if (typeof valeur === "string") return valeur.trim().length > 0;
  // `false` est une RÉPONSE dans un vrai/faux, pas une absence de réponse.
  if (typeof valeur === "boolean") return true;
  if (typeof valeur === "number") return Number.isFinite(valeur);
  if (Array.isArray(valeur)) {
    return valeur.some((v) => (typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined));
  }
  if (typeof valeur === "object") {
    // Texte à trous : rempli dès qu'UN trou porte du texte. Exiger tous les
    // trous ferait passer une copie partielle pour une copie blanche.
    return Object.values(valeur as Record<string, unknown>).some((v) =>
      typeof v === "string" ? v.trim().length > 0 : v !== null && v !== undefined
    );
  }
  return true;
}

/** Nombre d'entrées effectivement renseignées parmi `ids`. */
export function compterDonnees(ids: readonly string[], reponses: Record<string, unknown>): number {
  return ids.filter((id) => estRepondue(reponses[id])).length;
}
