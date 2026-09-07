/**
 * Direction d'acteur : le texte passé au paramètre `instructions` du TTS.
 *
 * `voice` change le timbre, `instructions` change le jeu. Sans jeu, deux voix
 * distinctes lisent quand même toutes les deux un texte à voix haute, chacune
 * sur sa ligne mélodique, et l'ensemble ne sonne pas comme une conversation.
 *
 * Réserve honnête : ce paramètre ORIENTE la diction, il ne la commande pas.
 * Deux appels identiques ne donnent pas exactement le même résultat, et rien
 * ici ne garantit un accent ou un âge. C'est de la direction d'acteur, pas du
 * réglage de synthétiseur.
 *
 * Non supporté par `tts-1` / `tts-1-hd` : l'appelant doit omettre le paramètre
 * sur ces modèles, sous peine d'erreur 400.
 *
 * Module pur : entrée texte, sortie texte.
 */
import type { NiveauCecrl } from "@/lib/hoeren/situations";
import type { ProfilVocal } from "@/lib/hoeren/voices";

/** Modèles acceptant `instructions`, d'après la doc OpenAI (août 2026). */
export function supporteInstructions(modele: string): boolean {
  return !/^tts-1(-hd)?$/.test(modele);
}

const REGISTRE: Record<ProfilVocal["registre"], string> = {
  neutre: "Ton neutre et naturel, comme dans une conversation ordinaire.",
  professionnel: "Ton posé et courtois d'un professionnel au travail.",
  chaleureux: "Ton chaleureux et détendu, proche d'un ami.",
  formel: "Ton formel et mesuré, distance polie.",
};

const NIVEAU: Record<NiveauCecrl, string> = {
  A1: "Articule très nettement et lentement, en marquant chaque mot. Destiné à un grand débutant.",
  A2: "Articule nettement, débit calme, pauses claires entre les groupes de sens.",
  B1: "Débit de conversation normale, articulation soignée mais sans exagération.",
  B2: "Débit naturel et spontané, avec les hésitations et les liaisons de l'oral courant.",
  C1: "Débit vif de locuteur natif, élisions et enchaînements naturels, sans ralentissement pédagogique.",
  C2: "Débit pleinement naturel, aucune concession à l'apprenant.",
};

export type ContexteJeu = {
  profil: ProfilVocal;
  niveau: NiveauCecrl;
  /** Rôle du personnage dans la scène (patient, employé, journaliste…). */
  role?: string;
  /** Décor, pour ancrer l'intention. */
  decor?: string;
};

export function construireInstructions(ctx: ContexteJeu): string {
  const lignes = [
    "Tu es un locuteur natif allemand (Hochdeutsch standard).",
    NIVEAU[ctx.niveau],
    REGISTRE[ctx.profil.registre],
  ];

  if (ctx.role) lignes.push(`Tu joues : ${ctx.role}.`);
  if (ctx.decor) lignes.push(`Situation : ${ctx.decor}.`);

  lignes.push(
    // La consigne décisive. Le modèle lit ce qu'on lui donne, y compris une
    // étiquette de locuteur laissée par erreur dans le texte. Le validateur
    // de dialogue les rejette déjà en amont ; cette ligne est la seconde
    // barrière, parce qu'un « Mann sagt » prononcé ruine l'exercice entier.
    "Prononce UNIQUEMENT le texte fourni. N'ajoute aucun nom de personnage, aucune annonce, aucun commentaire.",
    "Ne lis pas comme un texte écrit : parle comme quelqu'un qui s'adresse à son interlocuteur."
  );

  return lignes.join(" ");
}
