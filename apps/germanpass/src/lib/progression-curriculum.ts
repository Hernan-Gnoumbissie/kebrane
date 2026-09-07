/**
 * Règles de progression du curriculum (UX-08).
 *
 * Module PUR : aucune base, aucune session. Les règles de déblocage décident de
 * ce qu'un apprenant peut faire ou non — elles doivent être lisibles et
 * testables sans monter une base, comme `session-format` et `tendance`.
 *
 * MODÈLE, tel qu'arrêté avec le PO :
 *
 *   Niveau (A1) → CHAPITRE (= un cours) → Leçons → Activités
 *
 * Une leçon se compose d'un contenu, parfois d'un audio, et d'un bloc
 * d'exercices. Le « quiz » n'est PAS un objet distinct : c'est ce bloc, quels
 * que soient les formats employés (QCM, texte à trous, appariement, remise en
 * ordre…). C'est pourquoi rien n'est ajouté au modèle d'exercice.
 *
 * Le test de fin de chapitre est une LEÇON marquée comme telle — la dernière du
 * cours. Elle réutilise ainsi le contenu, la notation et le suivi déjà en place
 * plutôt qu'un mécanisme parallèle.
 *
 * ⚠ Ce système est VOLONTAIREMENT SÉPARÉ du déblocage de niveau par
 * l'entraînement (`LevelMastery`, 70 % sur 5 sessions). Les coupler
 * interdirait toute progression à la formule « préparation intensive », qui
 * n'a pas accès au curriculum : ces clients paient et ne pourraient jamais
 * changer de niveau.
 */

export type ActiviteLecon = "CONTENU" | "AUDIO" | "EXERCICES";

/** Seuil de réussite du bloc d'exercices, en pourcentage. */
export const SEUIL_REUSSITE = 70;

/**
 * Délai avant une nouvelle tentative, après un échec — en MINUTES.
 *
 * Court à dessein (décision PO). Il existe pour laisser le temps de relire la
 * leçon, pas pour sanctionner : quelques minutes suffisent à cela, des heures
 * ne feraient que décourager quelqu'un qui vient d'échouer.
 *
 * Volontairement FIXE, et non croissant à chaque échec. Un délai qui s'allonge
 * se lit comme une punition — exactement ce que le Manifeste refuse, et
 * d'autant plus mal reçu dans un service payant. Celui qui échoue trois fois a
 * besoin d'aide, pas d'attente.
 */
export const DELAI_REVISION_MINUTES = 10;

export type Lecon = {
  id: string;
  /** L'audio n'est attendu que si la leçon en propose un. */
  aAudio: boolean;
  estTestChapitre: boolean;
};

export type EtatLecon = {
  activitesTerminees: readonly ActiviteLecon[];
  /** Meilleur score au bloc d'exercices, en %. `null` = jamais tenté. */
  meilleurScore: number | null;
  /** Date avant laquelle une nouvelle tentative est refusée, après un échec. */
  prochaineTentativeLe: Date | null;
};

export const ETAT_VIERGE: EtatLecon = {
  activitesTerminees: [],
  meilleurScore: null,
  prochaineTentativeLe: null,
};

/** Activités que cette leçon exige — l'audio seulement si elle en a un. */
export function activitesAttendues(lecon: Lecon): ActiviteLecon[] {
  return lecon.aAudio ? ["CONTENU", "AUDIO", "EXERCICES"] : ["CONTENU", "EXERCICES"];
}

/**
 * Les exercices s'ouvrent quand le contenu a été suivi — et l'audio écouté s'il
 * y en a un. C'est la règle du PO : l'accès au quiz n'est conditionné que par
 * le fait d'avoir suivi le cours, jamais par un score.
 */
export function exercicesAccessibles(lecon: Lecon, etat: EtatLecon): boolean {
  const prealables = activitesAttendues(lecon).filter((a) => a !== "EXERCICES");
  return prealables.every((a) => etat.activitesTerminees.includes(a));
}

/** Une leçon est complète quand TOUT est fait et que le score atteint le seuil. */
export function leconEstComplete(lecon: Lecon, etat: EtatLecon): boolean {
  const toutFait = activitesAttendues(lecon).every((a) => etat.activitesTerminees.includes(a));
  return toutFait && (etat.meilleurScore ?? 0) >= SEUIL_REUSSITE;
}

/**
 * Après un échec, l'apprenant revoit le cours pendant un délai.
 *
 * Présenté comme de la CONSOLIDATION, jamais comme une sanction : le message
 * qui accompagne ce refus doit expliquer pourquoi revenir plus tard sert
 * l'apprentissage. Un délai vécu comme une punition serait un dark pattern, ce
 * que le Manifeste refuse — d'autant plus dans un service payant.
 */
export function nouvelleTentativePossible(etat: EtatLecon, maintenant: Date): boolean {
  if (!etat.prochaineTentativeLe) return true;
  return maintenant.getTime() >= etat.prochaineTentativeLe.getTime();
}

/** Échéance à enregistrer après un échec au bloc d'exercices. */
export function prochaineTentativeApresEchec(maintenant: Date): Date {
  return new Date(maintenant.getTime() + DELAI_REVISION_MINUTES * 60_000);
}

/** Minutes restantes avant de pouvoir retenter — 0 si c'est déjà possible. */
export function minutesAvantNouvelleTentative(etat: EtatLecon, maintenant: Date): number {
  if (nouvelleTentativePossible(etat, maintenant)) return 0;
  const restant = etat.prochaineTentativeLe!.getTime() - maintenant.getTime();
  return Math.ceil(restant / 60_000);
}

/**
 * Déverrouillage séquentiel : la leçon d'indice `i` s'ouvre si toutes celles
 * qui la précèdent sont complètes. La première est toujours ouverte — sinon
 * personne ne pourrait commencer.
 */
export function leconDeverrouillee(
  index: number,
  lecons: readonly Lecon[],
  etats: ReadonlyMap<string, EtatLecon>
): boolean {
  for (let i = 0; i < index; i += 1) {
    const precedente = lecons[i];
    if (!precedente) return false;
    if (!leconEstComplete(precedente, etats.get(precedente.id) ?? ETAT_VIERGE)) return false;
  }
  return true;
}

/**
 * Un chapitre est franchi quand son TEST est réussi.
 *
 * Un chapitre sans test déclaré est franchi dès que toutes ses leçons le sont :
 * il vaut mieux laisser avancer que bloquer sur une donnée manquante — le
 * contenu se construit progressivement, et un chapitre incomplet ne doit pas
 * emmurer l'apprenant.
 */
export function chapitreFranchi(
  lecons: readonly Lecon[],
  etats: ReadonlyMap<string, EtatLecon>
): boolean {
  if (lecons.length === 0) return false;
  const test = lecons.find((l) => l.estTestChapitre);
  if (test) return leconEstComplete(test, etats.get(test.id) ?? ETAT_VIERGE);
  return lecons.every((l) => leconEstComplete(l, etats.get(l.id) ?? ETAT_VIERGE));
}

/** Avancement d'un chapitre en pourcentage — le « 47 % abgeschlossen » de Moodle. */
export function progressionChapitre(
  lecons: readonly Lecon[],
  etats: ReadonlyMap<string, EtatLecon>
): number {
  if (lecons.length === 0) return 0;
  const completes = lecons.filter((l) =>
    leconEstComplete(l, etats.get(l.id) ?? ETAT_VIERGE)
  ).length;
  return Math.round((completes / lecons.length) * 100);
}
