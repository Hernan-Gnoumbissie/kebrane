import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL_GENERATION: z.string().default("gpt-4o"),
  AI_MODEL_EVALUATION: z.string().default("gpt-4o"),
  // Modèle de vision pour l'OCR des copies manuscrites (Schreiben sur papier).
  VISION_MODEL: z.string().default("gpt-4o"),
  AI_MODEL_EMBEDDING: z.string().default("text-embedding-3-small"),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  AI_MONTHLY_BUDGET_USER_USD: z.coerce.number().positive().default(5),
  TTS_MODEL: z.string().default("tts-1"),
  STT_MODEL: z.string().default("whisper-1"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("GermanPass <no-reply@germanpass.io>"),
  STORAGE_DIR: z.string().default("./storage"),
  PAYMENT_ORANGE_MONEY: z.string().optional(),
  PAYMENT_MTN_MOMO: z.string().optional(),
  PAYMENT_PAYPAL: z.string().optional(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().positive().default(900),
  // --- Plateforme Kebrane (KB-08) ---
  // Base Core (compte Kebrane, registre produits, accès). Distincte de
  // DATABASE_URL (base métier GermanPass). Absente => pont Core désactivé.
  KEBRANE_DATABASE_URL: z.string().optional(),
  // Gating par l'accès produit Core. Tant que `billing` n'est pas dans Core
  // (KB-13), GermanPass reste la source de vérité : le crochet observe sans
  // bloquer. Passer à "1" pour rendre le refus effectif.
  KEBRANE_ACCESS_ENFORCE: z
    .enum(["0", "1", "true", "false"])
    .default("0")
    .transform((v) => v === "1" || v === "true"),
  // Enveloppe IA Kebrane (KB-13). Comme ci-dessus, en OBSERVATION par défaut :
  // les coûts estimés ne sont pas encore mesurés, et bloquer un membre payant
  // sur la foi d'une estimation serait pire que laisser passer quelques appels.
  // Passer à "1" une fois `ai:cost` exploité sur des corrections réelles.
  KEBRANE_AI_BUDGET_ENFORCE: z
    .enum(["0", "1", "true", "false"])
    .default("0")
    .transform((v) => v === "1" || v === "true"),
});

export const env = envSchema.parse(process.env);

// Avertissements non bloquants pour les variables optionnelles importantes
if (!env.AI_API_KEY && process.env.NODE_ENV === "production") {
  console.warn("[env] AI_API_KEY non défini — les fonctions IA seront inopérantes en production.");
}
if (env.SMTP_HOST && env.SMTP_USER && !env.SMTP_PASSWORD) {
  console.warn("[env] SMTP_HOST et SMTP_USER définis mais SMTP_PASSWORD absent — les emails ne pourront pas être envoyés.");
}
