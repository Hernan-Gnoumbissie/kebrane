// @kebrane/core — capacités vendables (KB-13).
//
// **Le code définit ce qui EXISTE ; la base définit ce qui est VENDU.**
// Une offre (`Plan`) référence des clés d'ici ; l'administrateur choisit
// lesquelles entrent dans quel pack, mais il ne peut pas en inventer. Sans
// cette limite, l'écran d'administration se transforme en moteur de règles et
// plus personne ne sait ce qu'un pack donne réellement.
//
// Modèle retenu (décision PO du 4 août 2026) : **freemium**. Les cours et les
// examens blancs sont libres — ils ne coûtent presque rien à servir et attirent
// du monde. La rareté porte sur la seule **correction IA**, qui est à la fois ce
// qui coûte et ce qui a de la valeur. À l'épuisement de l'enveloppe : blocage
// jusqu'au renouvellement, sans vente de complément.

export const CAPABILITIES = {
  /** Lire les leçons et le contenu de cours. */
  LESSON_READ: "lesson.read",
  /** Passer des examens blancs (sans correction IA). */
  EXAM_RUN: "exam.run",
  /** Consulter sa progression et ses statistiques. */
  PROGRESS_VIEW: "progress.view",
  /** Correction automatique d'une production écrite. */
  CORRECTION_WRITING: "correction.writing",
  /** Correction automatique d'une production orale (transcription incluse). */
  CORRECTION_SPEAKING: "correction.speaking",

  // --- Réservées : la clé existe, la fonctionnalité pas encore. ---------------
  // Les nommer aujourd'hui ne coûte rien et évite une migration le jour venu :
  // les activer se réduira à une ligne de configuration dans une offre.
  /** Chat ancré dans une leçon (RAG). ⚠ Non implémenté. À vendre, jamais à
   *  offrir : une conversation est NON BORNÉE, là où une correction est un coup
   *  unique. Sur du contenu gratuit, elle rendrait le coût marginal
   *  proportionnel au trafic gratuit. */
  TUTOR_CHAT: "tutor.chat",
  /** Bibliothèque et dictionnaire internes. ⚠ Non implémenté. Servi en données
   *  statiques, son coût à l'usage est nul — candidat naturel au gratuit. */
  LIBRARY_DICTIONARY: "library.dictionary",
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

/** Toutes les clés connues — sert à rejeter une offre mal composée. */
export const ALL_CAPABILITIES: readonly Capability[] = Object.values(CAPABILITIES);

export function isKnownCapability(key: string): key is Capability {
  return (ALL_CAPABILITIES as readonly string[]).includes(key);
}

/**
 * Ce dont dispose un compte SANS payer.
 *
 * Défini dans le code et non en base : c'est une promesse produit, pas un
 * paramètre commercial. La rendre modifiable depuis un écran d'administration
 * reviendrait à pouvoir retirer en un clic ce qui a été annoncé publiquement.
 */
export const FREE_CAPABILITIES: readonly Capability[] = [
  CAPABILITIES.LESSON_READ,
  CAPABILITIES.EXAM_RUN,
  CAPABILITIES.PROGRESS_VIEW,
  CAPABILITIES.CORRECTION_WRITING,
  CAPABILITIES.CORRECTION_SPEAKING,
];

/**
 * Enveloppe IA offerte, en micro-dollars (1 000 000 = 1 $).
 *
 * Dimensionnée pour **une correction écrite complète** — feedback IA compris.
 * L'essai doit montrer exactement ce qu'on achète : un examen sans correction
 * ne démontrerait rien, et reviendrait à demander au prospect d'acheter à
 * l'aveugle.
 *
 * ⚠ Une correction ORALE coûte 2 à 3 fois plus (transcription + évaluation) :
 * elle ne tient donc pas dans cette enveloppe et sera refusée. C'est assumé —
 * la promesse est « une correction écrite offerte ». Relever ce nombre suffit
 * à l'étendre à l'oral.
 *
 * Estimation, non mesurée : ~0,02 $ la correction écrite (voir
 * `pnpm --filter @kebrane/germanpass ai:cost`). À réviser sur données réelles.
 */
export const FREE_AI_BUDGET_MICRO_USD = 30_000;

/** Confort de lecture : 1 $ = 1 000 000 micro-dollars. */
export const MICRO_USD_PER_USD = 1_000_000;
