import { z } from "zod";

/**
 * Schémas d'authentification — source unique de vérité, importée par la route
 * d'inscription (validation serveur) et par l'écran d'inscription (retour
 * immédiat). Les messages sont rédigés pour être affichés tels quels sous le
 * champ concerné.
 */

export const PASSWORD_MIN = 8;

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const PROVIDERS = ["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"] as const;

/** Retire les espaces de bord et compresse les espaces internes. */
export const cleanName = (v: string) => v.trim().replace(/\s+/g, " ");
/** Normalise un e-mail : sans espace, en minuscules. */
export const cleanEmail = (v: string) => v.trim().toLowerCase();

const nameSchema = z
  .string()
  .transform(cleanName)
  .pipe(
    z
      .string()
      .min(2, "Indiquez vos prénom et nom (2 caractères minimum).")
      .max(100, "Le nom ne peut pas dépasser 100 caractères."),
  );

const emailSchema = z
  .string()
  .transform(cleanEmail)
  .pipe(
    z
      .string()
      .email("Cette adresse e-mail est incomplète — exemple : nom@exemple.com")
      .max(255, "L'adresse e-mail est trop longue."),
  );

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`)
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
  .regex(/[A-Z]/, "Ajoutez au moins une majuscule.")
  .regex(/[a-z]/, "Ajoutez au moins une minuscule.")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre.");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  locale: z.enum(["fr", "en"]).default("fr"), // langue native (Cameroun bilingue)
  targetProvider: z.enum(PROVIDERS).optional(),
  currentLevel: z.enum(LEVELS).default("A1"), // niveau actuel déclaré
  targetLevel: z.enum(LEVELS).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/* ────────────────────────────────────────────────────────────
   Validation champ par champ (côté interface)
   ──────────────────────────────────────────────────────────── */

const FIELD_SCHEMAS = {
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
} as const;

export type ValidatableField = keyof typeof FIELD_SCHEMAS;

/**
 * Valide un champ isolé et renvoie le premier message d'erreur, ou `null`.
 * Permet de valider au blur et à chaque changement d'étape, sans soumettre.
 */
export function validateField(field: ValidatableField, value: string): string | null {
  const result = FIELD_SCHEMAS[field].safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "Valeur invalide.");
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return "Saisissez à nouveau votre mot de passe.";
  if (password !== confirm) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}

/**
 * Le niveau visé doit être supérieur ou égal au niveau actuel.
 * Renvoie `null` si le champ est vide (il est facultatif).
 */
export function validateTargetLevel(currentLevel: string, targetLevel: string): string | null {
  if (!targetLevel) return null;
  const current = LEVELS.indexOf(currentLevel as (typeof LEVELS)[number]);
  const target = LEVELS.indexOf(targetLevel as (typeof LEVELS)[number]);
  if (target < current)
    return `Le niveau visé doit être au moins égal à votre niveau actuel (${currentLevel}).`;
  return null;
}

/**
 * Score indicatif de robustesse : 1 (faible) · 2 (correct) · 3 (robuste).
 * Purement informatif — ne bloque jamais la soumission.
 */
export function scorePassword(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  let points = 0;
  if (value.length >= PASSWORD_MIN) points += 1;
  if (value.length >= 12) points += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1;
  if (/\d/.test(value)) points += 1;
  if (/[^A-Za-z0-9]/.test(value)) points += 1;
  if (points <= 2) return 1;
  if (points <= 3) return 2;
  return 3;
}

/* ────────────────────────────────────────────────────────────
   Traduction des réponses d'erreur du serveur
   ──────────────────────────────────────────────────────────── */

export interface ApiFailure {
  ok?: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: { fieldErrors?: Record<string, string[]> };
  };
}

export interface DescribedError {
  message: string;
  fieldErrors: Record<string, string>;
}

/**
 * Convertit une réponse d'API en message exploitable, en privilégiant les
 * erreurs rattachées à un champ. Évite « Une erreur est survenue » dès qu'une
 * cause précise est connue.
 */
export function describeApiFailure(
  status: number,
  body: ApiFailure | null,
  fallback = "L'opération n'a pas abouti.",
): DescribedError {
  const fieldErrors: Record<string, string> = {};
  const details = body?.error?.details?.fieldErrors;
  if (details) {
    for (const [key, messages] of Object.entries(details)) {
      if (messages?.length) fieldErrors[key] = messages.join(" ");
    }
  }
  if (Object.keys(fieldErrors).length > 0) return { message: "", fieldErrors };

  if (status === 429)
    return {
      message: "Trop de tentatives. Patientez quelques minutes avant de réessayer.",
      fieldErrors,
    };
  if (status >= 500)
    return {
      message: "Le serveur rencontre un problème. Réessayez dans un instant.",
      fieldErrors,
    };

  return { message: body?.error?.message ?? fallback, fieldErrors };
}

/** Message affiché quand la requête n'a même pas atteint le serveur. */
export const NETWORK_ERROR_MESSAGE =
  "Connexion au serveur impossible. Vérifiez votre connexion internet puis réessayez.";
