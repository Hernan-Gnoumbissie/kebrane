/**
 * Correction IA des productions écrites (Schreiben), par critères PUBLICS
 * du provider (ex. Goethe : Erfüllung, Kohärenz, Wortschatz, Strukturen).
 * Sortie JSON stricte validée Zod ; feedback en ALLEMAND niveaugerecht +
 * langue native du candidat (fr | en).
 */
import { z } from "zod";
import type { WritingPrompt } from "@prisma/client";
import { chatCompletion } from "@/lib/ai";
import { env } from "@/lib/env";

export type NativeLang = "fr" | "en";

export const NATIVE_LANG_LABEL: Record<NativeLang, string> = {
  fr: "FRANÇAIS",
  en: "ANGLAIS (English)",
};

export const errorTypeSchema = z.enum([
  "Grammatik",
  "Rechtschreibung",
  "Wortschatz",
  "Syntax",
  "Kohärenz",
  "Register",
]);

export const writingFeedbackSchema = z.object({
  perCriterion: z
    .array(
      z.object({
        key: z.string(),
        score: z.number().min(0),
        max: z.number().positive(),
        commentDe: z.string(),
        commentNative: z.string(),
      })
    )
    .min(1),
  totalPoints: z.number().min(0),
  maxPoints: z.number().positive(),
  estimatedLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  errors: z.array(
    z.object({
      type: errorTypeSchema,
      excerpt: z.string(),
      correction: z.string(),
      explanationDe: z.string(),
      explanationNative: z.string(),
    })
  ),
  recommendationsDe: z.array(z.string()).min(1),
  recommendationsNative: z.array(z.string()).min(1),
  summaryDe: z.string(),
  summaryNative: z.string(),
});
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

/** Critères par défaut si le prompt n'en définit pas (barème public Goethe-like). */
const DEFAULT_CRITERIA = [
  { key: "erfuellung", labelDe: "Erfüllung", maxPoints: 5 },
  { key: "kohaerenz", labelDe: "Kohärenz", maxPoints: 5 },
  { key: "wortschatz", labelDe: "Wortschatz", maxPoints: 5 },
  { key: "strukturen", labelDe: "Strukturen", maxPoints: 5 },
];

type Criterion = { key: string; labelDe: string; labelFr?: string; maxPoints: number; description?: string };

export function getCriteria(prompt: WritingPrompt): Criterion[] {
  const raw = prompt.criteria;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as Criterion[];
  }
  return DEFAULT_CRITERIA;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Validation et recalage du total (déterministe côté serveur, jamais confiance au LLM). */
export function normalizeFeedback(raw: unknown, criteria: Criterion[]): WritingFeedback {
  const parsed = writingFeedbackSchema.parse(raw);
  // Clamp des scores au max de chaque critère et recalcul du total
  const byKey = new Map(criteria.map((c) => [c.key, c]));
  let total = 0;
  let max = 0;
  const perCriterion = parsed.perCriterion.map((pc) => {
    const def = byKey.get(pc.key);
    const maxPoints = def?.maxPoints ?? pc.max;
    const score = Math.min(Math.max(pc.score, 0), maxPoints);
    total += score;
    max += maxPoints;
    return { ...pc, score, max: maxPoints };
  });
  return { ...parsed, perCriterion, totalPoints: Math.round(total * 10) / 10, maxPoints: max };
}

export async function evaluateWriting(params: {
  userId: string;
  prompt: WritingPrompt;
  text: string;
  nativeLang: NativeLang;
}): Promise<WritingFeedback & { lang: NativeLang }> {
  const criteria = getCriteria(params.prompt);
  const words = countWords(params.text);
  const native = NATIVE_LANG_LABEL[params.nativeLang];

  const system = `Tu es un examinateur certifié DaF (allemand langue étrangère), spécialiste des critères publics ${params.prompt.provider} niveau ${params.prompt.level}.
Tu évalues une production écrite selon ces critères (score de 0 à max, demi-points autorisés) :
${criteria.map((c) => `- "${c.key}" (${c.labelDe}${c.labelFr ? ` / ${c.labelFr}` : ""}), max ${c.maxPoints} points${c.description ? ` : ${c.description}` : ""}`).join("\n")}

Contraintes de la tâche : ${params.prompt.minWords ?? "—"} à ${params.prompt.maxWords ?? "—"} mots (le candidat en a écrit ${words}).
Si le texte est hors sujet ou trop court, le critère d'accomplissement de la tâche doit être fortement pénalisé.

Réponds UNIQUEMENT en JSON strict :
{
 "perCriterion": [{"key": string, "score": number, "max": number, "commentDe": string, "commentNative": string}],
 "totalPoints": number, "maxPoints": number,
 "estimatedLevel": "A1"|"A2"|"B1"|"B2"|"C1"|"C2",
 "errors": [{"type": "Grammatik"|"Rechtschreibung"|"Wortschatz"|"Syntax"|"Kohärenz"|"Register", "excerpt": string (extrait exact du candidat), "correction": string (version corrigée en allemand), "explanationDe": string, "explanationNative": string}],
 "recommendationsDe": [string], "recommendationsNative": [string],
 "summaryDe": string, "summaryNative": string
}
Les champs *De sont en ALLEMAND SIMPLE adapté au niveau ${params.prompt.level} ; les champs *Native sont la même chose en ${native}. Exemples et corrections toujours en ALLEMAND. Maximum 15 erreurs, les plus importantes d'abord.`;

  const user = `CONSIGNE (${params.prompt.title}) :
${params.prompt.instructions}

PRODUCTION DU CANDIDAT :
${params.text}`;

  const raw = await chatCompletion({
    userId: params.userId,
    kind: "writing_eval",
    model: env.AI_MODEL_EVALUATION,
    system,
    user,
    jsonMode: true,
    temperature: 0.2,
    // Schéma vérifié DANS l'appel : un JSON de mauvaise forme est un échec
    // (réserve remboursée), pas une correction facturée (invariant C).
    validate: (raw) => {
      writingFeedbackSchema.parse(raw);
    },
  });

  return { ...normalizeFeedback(JSON.parse(raw), criteria), lang: params.nativeLang };
}
