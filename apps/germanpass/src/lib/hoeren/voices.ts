/**
 * Casting vocal des dialogues Hören.
 *
 * AVERTISSEMENT, et il est important : l'API TTS n'expose AUCUN paramètre
 * d'âge, de genre ou d'accent régional. Les seuls leviers réels sont `voice`
 * (un timbre parmi une liste fermée), `speed`, et — uniquement sur les modèles
 * récents — `instructions`, un texte libre qui oriente la diction.
 *
 * Ce qui suit est donc un CASTING, au sens du théâtre : on choisit un timbre
 * parce qu'il est perçu comme masculin ou féminin, jeune ou mûr. Ce n'est pas
 * une garantie biologique et le code ne prétendra jamais le contraire. Le champ
 * `percu` le dit dans son nom.
 *
 * Module pur : aucune E/S, aucun import de base. Il se teste seul.
 */

/** Voix réellement disponibles sur `gpt-4o-mini-tts` (doc OpenAI, août 2026). */
export const VOIX_GPT4O_MINI_TTS = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar",
] as const;

/** Sous-ensemble accepté par les modèles hérités `tts-1` / `tts-1-hd`. */
export const VOIX_TTS_1 = [
  "alloy",
  "ash",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
] as const;

export type NomVoix = (typeof VOIX_GPT4O_MINI_TTS)[number];

export type GenrePercu = "masculin" | "feminin" | "neutre";
export type TranchePercue = "jeune_adulte" | "adulte" | "adulte_mur";

export type ProfilVocal = {
  /** Identifiant stable du profil, stocké en base avec l'exercice. */
  id: string;
  voix: NomVoix;
  /** Perception, pas propriété : voir l'avertissement en tête de fichier. */
  percu: { genre: GenrePercu; tranche: TranchePercue };
  /** Registre de jeu, injecté dans `instructions`. */
  registre: "neutre" | "professionnel" | "chaleureux" | "formel";
  /** Disponible sur les modèles hérités ? Sert de repli si le modèle change. */
  compatibleTts1: boolean;
};

/**
 * Catalogue de casting. Volontairement court et lisible : quatre profils
 * couvrent les situations décrites (Alltag, Arztbesuch, Bewerbungsgespräch…),
 * les suivants servent aux Diskussion à trois ou quatre voix.
 */
export const PROFILS_VOCAUX: ProfilVocal[] = [
  {
    id: "PROFIL_A",
    voix: "nova",
    percu: { genre: "feminin", tranche: "jeune_adulte" },
    registre: "neutre",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_B",
    voix: "onyx",
    percu: { genre: "masculin", tranche: "adulte" },
    registre: "neutre",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_C",
    voix: "shimmer",
    percu: { genre: "feminin", tranche: "adulte_mur" },
    registre: "professionnel",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_D",
    voix: "echo",
    percu: { genre: "masculin", tranche: "adulte_mur" },
    registre: "professionnel",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_E",
    voix: "coral",
    percu: { genre: "feminin", tranche: "adulte" },
    registre: "chaleureux",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_F",
    voix: "ash",
    percu: { genre: "masculin", tranche: "jeune_adulte" },
    registre: "chaleureux",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_G",
    voix: "sage",
    percu: { genre: "neutre", tranche: "adulte" },
    registre: "formel",
    compatibleTts1: true,
  },
  {
    id: "PROFIL_H",
    voix: "ballad",
    percu: { genre: "masculin", tranche: "adulte" },
    registre: "formel",
    compatibleTts1: false,
  },
];

export function profilParId(id: string): ProfilVocal | undefined {
  return PROFILS_VOCAUX.find((p) => p.id === id);
}

/** Un personnage tel que le générateur le décrit, avant casting. */
export type PersonnageDemande = {
  id: string;
  nom: string;
  genre: GenrePercu;
  tranche?: TranchePercue;
  role?: string;
};

/** Le même, une fois une voix attribuée. */
export type PersonnageCaste = PersonnageDemande & {
  profilId: string;
  voix: NomVoix;
};

export class CastingImpossibleError extends Error {
  constructor(demandes: number, disponibles: number) {
    super(
      `Casting impossible : ${demandes} personnages pour ${disponibles} voix distinctes disponibles`
    );
    this.name = "CastingImpossibleError";
  }
}

/**
 * Attribue une voix DISTINCTE à chaque personnage.
 *
 * C'est le cœur de la correction : jusqu'ici un passage tirait une voix au
 * hasard et la plaquait sur tout le texte, donc les deux interlocuteurs
 * parlaient avec le même timbre. Ici, deux personnages ne peuvent pas repartir
 * avec la même voix — l'invariant est vérifié, pas espéré.
 *
 * @param exclues voix à ne pas utiliser (une régénération après échec TTS s'en
 *   sert pour écarter la voix fautive).
 */
export function casterPersonnages(
  personnages: PersonnageDemande[],
  options: { compatibleTts1?: boolean; exclues?: readonly string[] } = {}
): PersonnageCaste[] {
  const exclues = new Set(options.exclues ?? []);
  const catalogue = PROFILS_VOCAUX.filter(
    (p) => !exclues.has(p.voix) && (!options.compatibleTts1 || p.compatibleTts1)
  );

  if (personnages.length > catalogue.length) {
    throw new CastingImpossibleError(personnages.length, catalogue.length);
  }

  const prises = new Set<string>();
  return personnages.map((perso) => {
    // On cherche d'abord un profil qui correspond au genre ET à la tranche
    // demandés, puis au genre seul, puis n'importe quel profil libre. Le
    // dernier repli garantit qu'on sort toujours avec des voix distinctes,
    // quitte à s'éloigner du casting idéal : un timbre imparfait vaut mieux
    // qu'un dialogue à voix unique.
    const candidats = [
      (p: ProfilVocal) =>
        p.percu.genre === perso.genre &&
        (perso.tranche === undefined || p.percu.tranche === perso.tranche),
      (p: ProfilVocal) => p.percu.genre === perso.genre,
      () => true,
    ];

    for (const critere of candidats) {
      const trouve = catalogue.find((p) => !prises.has(p.voix) && critere(p));
      if (trouve) {
        prises.add(trouve.voix);
        return { ...perso, profilId: trouve.id, voix: trouve.voix };
      }
    }
    // Inatteignable : la garde de taille ci-dessus l'exclut.
    throw new CastingImpossibleError(personnages.length, catalogue.length);
  });
}

/** Vérifie l'invariant « autant de voix que de personnages ». */
export function voixToutesDistinctes(castes: readonly PersonnageCaste[]): boolean {
  return new Set(castes.map((c) => c.voix)).size === castes.length;
}
