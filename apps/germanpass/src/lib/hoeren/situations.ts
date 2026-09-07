/**
 * Situations d'écoute et profil de difficulté CECRL.
 *
 * Deux idées séparées, volontairement :
 *  - la SITUATION dit le décor et combien de personnes parlent (une Durchsage
 *    est un monologue, une Diskussion oppose trois ou quatre voix) ;
 *  - le NIVEAU dit à quelle vitesse et avec quelle densité on parle.
 *
 * Les deux se combinent : un Arztbesuch A1 et un Arztbesuch C1 partagent le
 * décor et rien d'autre. Module pur, testable sans réseau ni base.
 */

export type Situation = {
  cle: string;
  /** Libellé allemand, celui que voit l'admin. */
  libelle: string;
  /** Bornes réalistes du nombre de locuteurs pour ce décor. */
  locuteurs: { min: number; max: number };
  /** Décor injecté dans le prompt de génération. */
  decor: string;
};

export const SITUATIONS: Situation[] = [
  { cle: "ALLTAG", libelle: "Alltag", locuteurs: { min: 2, max: 3 }, decor: "une scène de la vie quotidienne" },
  { cle: "ARZTBESUCH", libelle: "Arztbesuch", locuteurs: { min: 2, max: 2 }, decor: "une consultation médicale" },
  { cle: "BAHNHOF", libelle: "Bahnhof", locuteurs: { min: 1, max: 2 }, decor: "une gare : guichet, quai ou annonce" },
  { cle: "UNIVERSITAET", libelle: "Universität", locuteurs: { min: 2, max: 3 }, decor: "le campus : secrétariat, cours, entre étudiants" },
  { cle: "ARBEITSPLATZ", libelle: "Arbeitsplatz", locuteurs: { min: 2, max: 4 }, decor: "le lieu de travail : réunion, consigne, collègues" },
  { cle: "BEWERBUNGSGESPRAECH", libelle: "Bewerbungsgespräch", locuteurs: { min: 2, max: 3 }, decor: "un entretien d'embauche" },
  { cle: "TELEFONAT", libelle: "Telefonat", locuteurs: { min: 2, max: 2 }, decor: "une conversation téléphonique" },
  { cle: "RESTAURANT", libelle: "Restaurant", locuteurs: { min: 2, max: 3 }, decor: "un restaurant : commande, addition, réclamation" },
  { cle: "EINKAUF", libelle: "Einkauf", locuteurs: { min: 2, max: 2 }, decor: "un commerce : achat, échange, conseil" },
  { cle: "WOHNUNGSSUCHE", libelle: "Wohnungssuche", locuteurs: { min: 2, max: 3 }, decor: "une recherche de logement : visite, bail, agence" },
  { cle: "BEHOERDE", libelle: "Behörde", locuteurs: { min: 2, max: 2 }, decor: "une administration : formalités, rendez-vous, documents" },
  { cle: "BANK", libelle: "Bank", locuteurs: { min: 2, max: 2 }, decor: "une banque : compte, virement, conseil" },
  { cle: "REISE", libelle: "Reise", locuteurs: { min: 2, max: 3 }, decor: "un voyage : réservation, itinéraire, imprévu" },
  { cle: "HOTEL", libelle: "Hotel", locuteurs: { min: 2, max: 2 }, decor: "un hôtel : réception, réservation, réclamation" },
  { cle: "NACHRICHT", libelle: "Nachricht", locuteurs: { min: 1, max: 2 }, decor: "un bulletin d'information radiophonique" },
  { cle: "INTERVIEW", libelle: "Interview", locuteurs: { min: 2, max: 2 }, decor: "une interview : questions et réponses développées" },
  { cle: "DISKUSSION", libelle: "Diskussion", locuteurs: { min: 3, max: 4 }, decor: "une discussion à plusieurs, avec des avis qui divergent" },
  { cle: "PODCAST", libelle: "Podcast", locuteurs: { min: 2, max: 3 }, decor: "un épisode de podcast, ton libre et spontané" },
  { cle: "DURCHSAGE", libelle: "Durchsage", locuteurs: { min: 1, max: 1 }, decor: "une annonce publique diffusée au haut-parleur" },
  { cle: "SPRACHNACHRICHT", libelle: "Sprachnachricht", locuteurs: { min: 1, max: 1 }, decor: "un message vocal laissé à un proche" },
];

export function situationParCle(cle: string): Situation | undefined {
  return SITUATIONS.find((s) => s.cle === cle);
}

export type NiveauCecrl = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type ProfilNiveau = {
  /** Débit, transmis tel quel au paramètre `speed` de l'API. */
  vitesse: number;
  /** Fourchette de répliques attendues. */
  repliques: { min: number; max: number };
  /** Longueur de phrase visée, en mots. */
  motsParReplique: { min: number; max: number };
  /** Plafond de locuteurs : un débutant ne suit pas quatre voix. */
  locuteursMax: number;
  /** Durée cible du dialogue final, en secondes. */
  dureeCibleSecondes: number;
  /** Contraintes linguistiques, injectées telles quelles dans le prompt. */
  consignes: string[];
};

/**
 * La difficulté ne se joue PAS uniquement sur le vocabulaire.
 *
 * C'est le point 6 du cahier des charges et c'est le plus facile à rater : un
 * générateur laissé libre écrit le même dialogue partout et ne change que
 * quelques mots. Ces contraintes-ci portent sur la longueur des phrases, le
 * débit, l'implicite, les reformulations et les informations distractrices —
 * c'est-à-dire sur ce qui rend une écoute réellement difficile.
 */
export const PROFILS_NIVEAU: Record<NiveauCecrl, ProfilNiveau> = {
  A1: {
    vitesse: 0.85,
    repliques: { min: 6, max: 10 },
    motsParReplique: { min: 3, max: 8 },
    locuteursMax: 2,
    dureeCibleSecondes: 45,
    consignes: [
      "Phrases très courtes, une information par réplique.",
      "Présent uniquement, vocabulaire du quotidien immédiat.",
      "Aucun implicite : tout ce qui est demandé est dit explicitement.",
      "Aucune information distractrice.",
    ],
  },
  A2: {
    vitesse: 0.9,
    repliques: { min: 8, max: 12 },
    motsParReplique: { min: 5, max: 12 },
    locuteursMax: 2,
    dureeCibleSecondes: 60,
    consignes: [
      "Phrases simples, parfois coordonnées par und/aber/oder.",
      "Passé composé (Perfekt) admis pour des faits quotidiens.",
      "Au plus une information distractrice, clairement écartée ensuite.",
    ],
  },
  B1: {
    vitesse: 0.95,
    repliques: { min: 10, max: 16 },
    motsParReplique: { min: 8, max: 18 },
    locuteursMax: 3,
    dureeCibleSecondes: 90,
    consignes: [
      "Conversation naturelle avec subordonnées (weil, dass, wenn).",
      "Une ou deux reformulations : le locuteur se reprend ou précise.",
      "Quelques informations distractrices plausibles.",
      "Un détail au moins doit se déduire du contexte, sans être énoncé.",
    ],
  },
  B2: {
    vitesse: 1.0,
    repliques: { min: 12, max: 20 },
    motsParReplique: { min: 10, max: 25 },
    locuteursMax: 4,
    dureeCibleSecondes: 120,
    consignes: [
      "Échange spontané : interruptions, hésitations, marqueurs oraux (also, na ja, eigentlich).",
      "Synonymes plutôt que reprises littérales — la question ne doit pas se résoudre par repérage de mot.",
      "Opinions nuancées, Konjunktiv II pour l'hypothèse et la politesse.",
      "Plusieurs informations distractrices crédibles.",
    ],
  },
  C1: {
    vitesse: 1.0,
    repliques: { min: 14, max: 24 },
    motsParReplique: { min: 12, max: 35 },
    locuteursMax: 4,
    dureeCibleSecondes: 150,
    consignes: [
      "Registre proche du réel : ellipses, sous-entendus, ironie légère possible.",
      "Vocabulaire abstrait et expressions idiomatiques.",
      "L'essentiel d'au moins une question ne figure nulle part littéralement.",
      "Structures denses : participes, nominalisations, subordination multiple.",
    ],
  },
  C2: {
    vitesse: 1.05,
    repliques: { min: 16, max: 28 },
    motsParReplique: { min: 12, max: 40 },
    locuteursMax: 4,
    dureeCibleSecondes: 180,
    consignes: [
      "Langue spontanée d'un locuteur natif cultivé, sans concession pédagogique.",
      "Allusions culturelles, implicite dense, changements de registre.",
      "Argumentation à plusieurs niveaux, concessions et contre-arguments.",
    ],
  },
};

/** Nombre de locuteurs réellement tenable, croisant décor et niveau. */
export function locuteursCibles(situation: Situation, niveau: NiveauCecrl): number {
  const profil = PROFILS_NIVEAU[niveau];
  const max = Math.min(situation.locuteurs.max, profil.locuteursMax);
  // Le minimum du décor prime : une Diskussion à deux n'est plus une
  // Diskussion. Si le niveau ne le permet pas, c'est le décor qu'il faut
  // changer, pas le nombre de voix.
  return Math.max(situation.locuteurs.min, Math.min(max, situation.locuteurs.min));
}
