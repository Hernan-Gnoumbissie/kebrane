/** Constantes partagées des écrans admin de la banque de contenu. */

export const PROVIDERS = ["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"] as const;
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const SECTIONS_RECEPTIVE = ["LESEN", "HOEREN"] as const;

export const TASK_FORMATS = [
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "TRUE_FALSE",
  "MATCHING",
  "GAP_FILL",
  "ORDERING",
] as const;

export const WRITING_FORMATS = [
  "LETTER_FORMAL",
  "LETTER_INFORMAL",
  "ESSAY",
  "FORUM_POST",
] as const;

export const SPEAKING_FORMATS = [
  "PICTURE_DESCRIPTION",
  "PRESENTATION",
  "DIALOGUE_ROLEPLAY",
  "PLANNING_TASK",
] as const;

export const COURSE_KINDS = ["GRAMMAR", "VOCABULARY", "REDEMITTEL"] as const;

export const TASK_FORMAT_LABELS: Record<string, string> = {
  MCQ_SINGLE: "QCM (1 réponse)",
  MCQ_MULTI: "QCM (plusieurs réponses)",
  TRUE_FALSE: "Vrai / Faux",
  MATCHING: "Appariement",
  GAP_FILL: "Texte à trous",
  ORDERING: "Remise en ordre",
  LETTER_FORMAL: "Lettre formelle",
  LETTER_INFORMAL: "Lettre informelle",
  ESSAY: "Essai / rédaction",
  FORUM_POST: "Post de forum",
  PICTURE_DESCRIPTION: "Description d'image",
  PRESENTATION: "Présentation",
  DIALOGUE_ROLEPLAY: "Jeu de rôle",
  PLANNING_TASK: "Planification commune",
};

export const COURSE_KIND_LABELS: Record<string, string> = {
  GRAMMAR: "Grammaire",
  VOCABULARY: "Vocabulaire",
  REDEMITTEL: "Redemittel",
};
