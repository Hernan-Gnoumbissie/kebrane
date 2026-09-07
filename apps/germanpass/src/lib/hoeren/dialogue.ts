/**
 * Structure d'un dialogue Hören, ses validations et sa transcription.
 *
 * Jusqu'ici un Hören était un `Passage.body` : une chaîne unique où
 * « Mann: … / Frau: … » n'étaient que des conventions typographiques. Rien dans
 * le modèle ne savait qu'il y avait deux personnes, donc rien ne pouvait leur
 * donner deux voix. C'est ce que ce module corrige : le dialogue devient une
 * donnée, avec des locuteurs identifiés.
 *
 * Le transcript textuel reste produit et écrit dans `body` — le RAG,
 * l'anti-copie, la relecture admin et les anciens écrans continuent d'y lire ce
 * qu'ils y ont toujours lu.
 *
 * Module pur : Zod et rien d'autre. Se teste sans réseau ni base.
 */
import { z } from "zod";
import type { NiveauCecrl } from "@/lib/hoeren/situations";
import { PROFILS_NIVEAU } from "@/lib/hoeren/situations";
import type { PersonnageCaste } from "@/lib/hoeren/voices";

/** Ce que le modèle doit renvoyer. Les noms sont ceux du prompt. */
export const dialogueGenereSchema = z.object({
  title: z.string().min(3),
  speakers: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        gender: z.enum(["male", "female", "neutral"]),
        age_group: z.enum(["young_adult", "adult", "older_adult"]).optional(),
        role: z.string().optional(),
      })
    )
    .min(1)
    .max(4),
  dialogue: z
    .array(
      z.object({
        speaker_id: z.string().min(1),
        text: z.string().min(1),
      })
    )
    .min(2),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(3),
        explanation: z.string().min(3),
        explanationFr: z.string().min(3),
        explanationEn: z.string().min(3),
        options: z
          .array(z.object({ text: z.string().min(1), isCorrect: z.boolean() }))
          .min(2)
          .max(6)
          .optional(),
      })
    )
    .min(1),
});

export type DialogueGenere = z.infer<typeof dialogueGenereSchema>;
export type RepliqueGeneree = DialogueGenere["dialogue"][number];

/** Traduit le vocabulaire du prompt vers celui du casting. */
export function versPersonnagesDemandes(dialogue: DialogueGenere) {
  const genres = { male: "masculin", female: "feminin", neutral: "neutre" } as const;
  const tranches = {
    young_adult: "jeune_adulte",
    adult: "adulte",
    older_adult: "adulte_mur",
  } as const;
  return dialogue.speakers.map((s) => ({
    id: s.id,
    nom: s.name,
    genre: genres[s.gender],
    tranche: s.age_group ? tranches[s.age_group] : undefined,
    role: s.role,
  }));
}

export type ProblemeDialogue = { code: string; message: string };

/**
 * Validations du dialogue AVANT toute dépense TTS.
 *
 * L'ordre compte : un dialogue invalide détecté ici coûte zéro, le même
 * détecté après génération coûte autant d'appels que de répliques.
 */
export function validerDialogue(
  dialogue: DialogueGenere,
  niveau: NiveauCecrl
): ProblemeDialogue[] {
  const problemes: ProblemeDialogue[] = [];
  const profil = PROFILS_NIVEAU[niveau];

  const ids = new Set(dialogue.speakers.map((s) => s.id));
  if (ids.size !== dialogue.speakers.length) {
    problemes.push({ code: "SPEAKER_ID_DUPLIQUE", message: "Deux personnages partagent un id." });
  }
  if (dialogue.speakers.length > profil.locuteursMax) {
    problemes.push({
      code: "TROP_DE_LOCUTEURS",
      message: `${dialogue.speakers.length} personnages pour un niveau ${niveau} qui en tolère ${profil.locuteursMax}.`,
    });
  }

  const orphelines = dialogue.dialogue.filter((r) => !ids.has(r.speaker_id));
  if (orphelines.length > 0) {
    problemes.push({
      code: "REPLIQUE_ORPHELINE",
      message: `${orphelines.length} réplique(s) attribuée(s) à un personnage inconnu.`,
    });
  }

  const muets = dialogue.speakers.filter(
    (s) => !dialogue.dialogue.some((r) => r.speaker_id === s.id)
  );
  if (muets.length > 0) {
    problemes.push({
      code: "PERSONNAGE_MUET",
      message: `Personnage(s) déclaré(s) mais sans réplique : ${muets.map((s) => s.name).join(", ")}.`,
    });
  }

  if (dialogue.dialogue.length < profil.repliques.min) {
    problemes.push({
      code: "DIALOGUE_TROP_COURT",
      message: `${dialogue.dialogue.length} répliques, minimum ${profil.repliques.min} au niveau ${niveau}.`,
    });
  }

  // Une didascalie lue à voix haute ruine l'exercice : l'apprenant entend
  // « Mann sagt » au lieu d'entendre un homme parler. On refuse à la source.
  const didascalie = /^\s*(mann|frau|sprecher(in)?|person|stimme|speaker)\s*\d*\s*[::]/i;
  for (const [i, r] of dialogue.dialogue.entries()) {
    if (didascalie.test(r.text)) {
      problemes.push({
        code: "DIDASCALIE_DANS_LA_REPLIQUE",
        message: `Réplique ${i + 1} : le texte contient une étiquette de locuteur, qui serait prononcée à voix haute.`,
      });
    }
    // Limite dure de l'API : 4096 caractères par appel.
    if (r.text.length > 4000) {
      problemes.push({
        code: "REPLIQUE_TROP_LONGUE",
        message: `Réplique ${i + 1} : ${r.text.length} caractères, au-delà de la limite TTS.`,
      });
    }
  }

  if (dialogue.speakers.length > 1) {
    const locuteursEntendus = new Set(dialogue.dialogue.map((r) => r.speaker_id));
    if (locuteursEntendus.size < 2) {
      problemes.push({
        code: "MONOLOGUE_DEGUISE",
        message: "Plusieurs personnages déclarés mais un seul prend la parole.",
      });
    }
  }

  return problemes;
}

/** Vérifie l'invariant central : deux personnages, deux voix. */
export function validerCasting(castes: readonly PersonnageCaste[]): ProblemeDialogue[] {
  const voix = castes.map((c) => c.voix);
  if (new Set(voix).size !== voix.length) {
    return [
      {
        code: "VOIX_PARTAGEE",
        message: "Deux personnages ont reçu la même voix — le dialogue serait monocorde.",
      },
    ];
  }
  return [];
}

/**
 * Transcript lisible, écrit dans `Passage.body`.
 *
 * Ce texte n'est JAMAIS envoyé au TTS — il ne sert qu'à la relecture humaine,
 * à l'anti-copie et à la correction. Les étiquettes qu'il contient sont donc
 * sans danger, contrairement à celles d'une réplique.
 */
export function transcript(dialogue: DialogueGenere): string {
  const nomParId = new Map(dialogue.speakers.map((s) => [s.id, s.name]));
  return dialogue.dialogue
    .map((r) => `${nomParId.get(r.speaker_id) ?? r.speaker_id}: ${r.text}`)
    .join("\n");
}

/** Estimation de durée avant génération, pour cadrer la dépense. */
export function dureeEstimeeSecondes(dialogue: DialogueGenere, vitesse: number): number {
  // ~15 caractères par seconde de parole allemande à vitesse 1,0. Approximation
  // assumée : elle sert à détecter un dialogue absurdement long, pas à afficher
  // une durée à l'apprenant — celle-là est mesurée sur l'audio réel.
  const caracteres = dialogue.dialogue.reduce((n, r) => n + r.text.length, 0);
  const pauses = dialogue.dialogue.length * 0.3;
  return Math.round(caracteres / 15 / vitesse + pauses);
}
