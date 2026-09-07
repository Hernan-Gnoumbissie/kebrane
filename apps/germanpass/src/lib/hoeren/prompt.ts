/**
 * Prompt de génération d'un dialogue Hören.
 *
 * Séparé de `lib/generation.ts` pour une raison concrète : c'est le fichier
 * qu'on rouvrira le plus souvent, et on veut pouvoir en relire l'intégralité
 * d'un coup d'œil quand un dialogue sort de travers.
 *
 * Leçon retenue de KB-38 : la contrainte de sujet appartient au message
 * SYSTÈME. Placée dans le message utilisateur, le modèle la traite comme une
 * suggestion et dérive. Et baisser la température n'y change rien — c'est même
 * contre-productif, une température basse ramène vers la réponse la plus
 * canonique, pas vers la consigne.
 *
 * Module pur : construit des chaînes, n'appelle rien.
 */
import { PROFILS_NIVEAU, type NiveauCecrl, type Situation } from "@/lib/hoeren/situations";

export function systemeDialogue(params: {
  niveau: NiveauCecrl;
  situation: Situation;
  locuteurs: number;
  itemCount: number;
}): string {
  const profil = PROFILS_NIVEAU[params.niveau];

  return [
    "Tu es un concepteur d'épreuves de compréhension orale en allemand (DaF).",
    `Tu écris un dialogue ORIGINAL de niveau CECRL ${params.niveau}, destiné à être enregistré par des voix distinctes.`,
    "INTERDIT : reproduire ou paraphraser un sujet d'examen officiel (Goethe, ÖSD, telc, ECL).",
    "",
    `SITUATION IMPOSÉE : ${params.situation.decor}. Le dialogue doit s'y dérouler entièrement.`,
    `NOMBRE DE PERSONNAGES IMPOSÉ : exactement ${params.locuteurs}.`,
    `LONGUEUR : entre ${profil.repliques.min} et ${profil.repliques.max} répliques, ${profil.motsParReplique.min} à ${profil.motsParReplique.max} mots par réplique.`,
    "",
    `CONTRAINTES DE NIVEAU ${params.niveau} — elles priment sur le style :`,
    ...profil.consignes.map((c) => `- ${c}`),
    "",
    "RÈGLE ABSOLUE SUR LE TEXTE DES RÉPLIQUES :",
    "le champ `text` contient UNIQUEMENT les mots prononcés par le personnage.",
    "Jamais de nom de locuteur, jamais « Mann: », « Frau: », « Sprecher 1: », jamais de didascalie,",
    "jamais de description entre parenthèses. Ce texte part directement à la synthèse vocale :",
    "tout ce qui s'y trouve SERA prononcé à voix haute.",
    "",
    `QUESTIONS : exactement ${params.itemCount}, portant sur des informations réellement contenues dans le dialogue.`,
    "Chaque question doit être résoluble par quelqu'un qui a écouté, et insoluble par quelqu'un qui ne l'a pas fait.",
    "Une seule option correcte. Les distracteurs doivent être plausibles et ancrés dans la situation,",
    "jamais absurdes — un distracteur ridicule donne la réponse sans écoute.",
    "",
    "Réponds UNIQUEMENT en JSON, sans texte autour :",
    '{"title": string (titre allemand court),',
    ' "speakers": [{"id": "speaker_1", "name": string (nom ou rôle allemand), "gender": "male"|"female"|"neutral", "age_group": "young_adult"|"adult"|"older_adult", "role": string}],',
    ' "dialogue": [{"speaker_id": "speaker_1", "text": string}],',
    ' "questions": [{"prompt": string (en allemand), "explanation": string (explication en allemand simple, citant la réplique concernée), "explanationFr": string, "explanationEn": string, "options": [{"text": string, "isCorrect": boolean}]}]}',
  ].join("\n");
}

export function utilisateurDialogue(params: {
  theme: string;
  extraitsRag: readonly string[];
}): string {
  const lignes = [`Thème du dialogue : ${params.theme}.`];
  if (params.extraitsRag.length > 0) {
    lignes.push(
      "",
      "Inspiration lexicale et thématique (NE PAS COPIER, seulement s'en inspirer) :",
      ...params.extraitsRag.map((c) => `- ${c.slice(0, 300)}`)
    );
  }
  return lignes.join("\n");
}
