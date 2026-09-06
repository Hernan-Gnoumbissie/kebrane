/**
 * Client IA OpenAI-compatible (AI_BASE_URL) : chat, embeddings, TTS, STT.
 * Chaque appel est tracé dans ai_usage (tokens, coût, latence) et soumis
 * au plafond mensuel utilisateur (coupure douce).
 */
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { reserveKebraneAi, settleKebraneAi } from "@/lib/kebrane";

export class AiBudgetExceededError extends Error {
  constructor() {
    super("Plafond IA mensuel atteint");
  }
}

// Tarifs indicatifs USD / 1M tokens (ou unité précisée).
// TTS : par 1M caractères. STT : par 1M secondes (approx, voir stt()).
const PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "text-embedding-3-small": { in: 0.02, out: 0 },
  "tts-1": { in: 15, out: 0 }, // USD / 1M caractères
  // gpt-4o-mini-tts est facturé 0,60 $/1M caractères en entrée PLUS 12 $/1M
  // tokens audio en sortie. On ne mesure pas les tokens audio (l'API ne les
  // renvoie pas sur cet endpoint), donc ce tarif est un ÉQUIVALENT par
  // caractère : ~0,015 $/min d'audio, à ~15 caractères/seconde de parole
  // allemande, soit ~16,7 $/1M caractères, plus les 0,60 $ d'entrée.
  // Approximation assumée pour le suivi budgétaire, pas une facture.
  "gpt-4o-mini-tts": { in: 17.3, out: 0 },
  "whisper-1": { in: 6_000, out: 0 }, // USD / 1M secondes ≈ 0,006 $/min ≈ 0,0001 $/s
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { in: 5, out: 15 };
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

/**
 * Coupure douce : vérifie la dépense avant un appel coûteux.
 *
 * Deux plafonds cohabitent, volontairement :
 *  - le **plafond mensuel historique** de GermanPass (`aiBudgetUsd` du membre,
 *    à défaut `AI_MONTHLY_BUDGET_USER_USD`) — filet anti-catastrophe ;
 *  - l'**enveloppe Kebrane** attachée à l'offre achetée (KB-13), qui est le
 *    vrai instrument commercial.
 *
 * La réserve Kebrane est prise AVANT l'appel : refuser après avoir dépensé ne
 * protège de rien. Elle est en OBSERVATION par défaut
 * (`KEBRANE_AI_BUDGET_ENFORCE=0`) — voir `lib/kebrane.ts`.
 */
export async function checkBudget(userId: string | null, kind?: string): Promise<void> {
  if (kind) {
    const reservation = await reserveKebraneAi({ userId, kind });
    if (reservation && !reservation.allowed) {
      if (reservation.enforced) throw new AiBudgetExceededError();
      // Mode observation : on trace le refus qu'on AURAIT prononcé, ce qui
      // permet de mesurer l'impact du plafond avant de l'activer.
      console.info(
        `[kebrane/ai-budget] refus observé (${kind}) : ${reservation.reason}, ` +
          `reste ${reservation.remainingMicroUsd} µ$`
      );
    }
  }
  if (!userId) return;
  const user = await db.user.findUnique({ where: { id: userId }, select: { aiBudgetUsd: true } });
  const budget = user?.aiBudgetUsd ? Number(user.aiBudgetUsd) : env.AI_MONTHLY_BUDGET_USER_USD;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const agg = await db.aiUsage.aggregate({
    where: { userId, createdAt: { gte: monthStart } },
    _sum: { costUsd: true },
  });
  const spent = Number(agg._sum.costUsd ?? 0);
  if (spent >= budget) throw new AiBudgetExceededError();
}

async function logUsage(params: {
  userId: string | null;
  kind: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
}): Promise<void> {
  const costUsd = estimateCost(params.model, params.inputTokens, params.outputTokens);
  await db.aiUsage
    .create({ data: { ...params, costUsd } })
    .catch(() => undefined);

  // Régularisation de l'enveloppe Kebrane (KB-13).
  //  - Succès : on ajuste la réserve estimée au coût réel mesuré.
  //  - Échec / sortie inexploitable : REMBOURSEMENT INTÉGRAL de la réserve
  //    (invariant C — un membre ne perd jamais une correction qu'il n'a pas
  //    reçue). Le coût réel des tokens éventuellement consommés reste tracé
  //    dans ai_usage ci-dessus (NOTRE coût), mais n'est pas imputé au membre.
  await settleKebraneAi({
    userId: params.userId,
    kind: params.kind,
    actualMicroUsd: Math.round(costUsd * 1_000_000),
    success: params.success,
  });
}

function aiHeaders(): Record<string, string> {
  if (!env.AI_API_KEY) throw new Error("AI_API_KEY manquant");
  return { Authorization: `Bearer ${env.AI_API_KEY}`, "Content-Type": "application/json" };
}

/** Timeout par défaut pour les appels IA (60 s chat/embed, 120 s TTS/STT). */
const AI_TIMEOUT_MS = 60_000;
const AI_AUDIO_TIMEOUT_MS = 120_000;

export async function chatCompletion(params: {
  userId: string | null;
  kind: string;
  model?: string;
  system: string;
  user: string;
  jsonMode?: boolean;
  temperature?: number;
  /**
   * Validation de la charge utile (invariant C). Appelée DANS le try, donc un
   * rejet compte comme un échec → réserve remboursée. Permet au caller de
   * déclarer une réponse « bien formée mais inexploitable » (mauvais schéma)
   * sans avoir déjà été facturé.
   */
  validate?: (parsedJson: unknown) => void;
}): Promise<string> {
  await checkBudget(params.userId, params.kind);
  const model = params.model ?? env.AI_MODEL_EVALUATION;
  const start = Date.now();
  let usage = { prompt_tokens: 0, completion_tokens: 0 };
  try {
    const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: aiHeaders(),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        temperature: params.temperature ?? 0.7,
        ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    usage = data.usage ?? usage;
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error("Réponse IA vide");
    // Validation AVANT de compter le succès : une réponse en JSON invalide ou de
    // mauvais schéma est un échec (→ remboursement), pas une correction rendue.
    if (params.jsonMode) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("Réponse IA en JSON invalide");
      }
      params.validate?.(parsed);
    }
    await logUsage({
      userId: params.userId,
      kind: params.kind,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs: Date.now() - start,
      success: true,
    });
    return content;
  } catch (e) {
    await logUsage({
      userId: params.userId,
      kind: params.kind,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs: Date.now() - start,
      success: false,
    });
    throw e;
  }
}

export async function embed(texts: string[], userId: string | null = null): Promise<number[][]> {
  await checkBudget(userId, "embedding");
  const model = env.AI_MODEL_EMBEDDING;
  const start = Date.now();
  const res = await fetch(`${env.AI_BASE_URL}/embeddings`, {
    method: "POST",
    headers: aiHeaders(),
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    body: JSON.stringify({ model, input: texts, dimensions: env.AI_EMBEDDING_DIMENSIONS }),
  });
  if (!res.ok) throw new Error(`Embeddings ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    data: { embedding: number[] }[];
    usage?: { prompt_tokens: number };
  };
  await logUsage({
    userId,
    kind: "embedding",
    model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: 0,
    latencyMs: Date.now() - start,
    success: true,
  });
  return data.data.map((d) => d.embedding);
}

/**
 * OCR par modèle de vision : transcrit une copie manuscrite (1 à plusieurs
 * images) en texte allemand brut, sans correction. Soumis au budget IA.
 */
export async function transcribeImage(params: {
  images: { base64: string; mime: string }[];
  userId: string | null;
}): Promise<string> {
  await checkBudget(params.userId, "vision_ocr");
  const model = env.VISION_MODEL;
  const start = Date.now();
  const system =
    "Du bist ein präziser OCR-Assistent. Transkribiere den handschriftlichen deutschen Text aus den Bildern exakt, Zeile für Zeile, ohne Korrekturen, ohne Ergänzungen, ohne Kommentare. Behalte Absätze bei. Gib AUSSCHLIESSLICH den transkribierten Text zurück.";
  const userContent = [
    { type: "text", text: "Transkribiere den handschriftlichen Text aus diesem/diesen Bild(ern)." },
    ...params.images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    })),
  ];
  let usage = { prompt_tokens: 0, completion_tokens: 0 };
  try {
    const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: aiHeaders(),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Vision ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    usage = data.usage ?? usage;
    const content = data.choices[0]?.message.content ?? "";
    await logUsage({
      userId: params.userId,
      kind: "vision_ocr",
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs: Date.now() - start,
      success: true,
    });
    return content.trim();
  } catch (e) {
    await logUsage({
      userId: params.userId,
      kind: "vision_ocr",
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      latencyMs: Date.now() - start,
      success: false,
    });
    throw e;
  }
}

/**
 * TTS : retourne le binaire audio.
 *
 * `format` par défaut mp3 — comportement historique inchangé. Le pipeline des
 * dialogues Hören demande `pcm` : il assemble les répliques échantillon par
 * échantillon puis encode une seule fois (voir lib/hoeren/pcm.ts).
 *
 * `instructions` n'est accepté que par les modèles récents ; `tts-1` et
 * `tts-1-hd` répondent 400 si on l'envoie. C'est à l'appelant de trancher —
 * `supporteInstructions()` dans lib/hoeren/instructions.ts.
 */
export async function tts(params: {
  text: string;
  voice: string;
  speed: number;
  userId?: string | null;
  model?: string;
  format?: "mp3" | "pcm" | "wav" | "opus" | "aac" | "flac";
  instructions?: string;
}): Promise<Buffer> {
  const start = Date.now();
  const model = params.model ?? env.TTS_MODEL;
  const res = await fetch(`${env.AI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: aiHeaders(),
    signal: AbortSignal.timeout(AI_AUDIO_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      input: params.text,
      voice: params.voice,
      speed: params.speed,
      response_format: params.format ?? "mp3",
      ...(params.instructions ? { instructions: params.instructions } : {}),
    }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await logUsage({
    userId: params.userId ?? null,
    kind: "tts",
    model,
    inputTokens: params.text.length,
    outputTokens: 0,
    latencyMs: Date.now() - start,
    success: true,
  });
  return buffer;
}

/** STT : transcription d'un audio (webm/opus, ogg, mp3). */
export async function stt(params: {
  audio: Buffer;
  filename: string;
  userId?: string | null;
}): Promise<string> {
  if (!env.AI_API_KEY) throw new Error("AI_API_KEY manquant");
  const start = Date.now();
  const form = new FormData();
  form.set("model", env.STT_MODEL);
  form.set("language", "de");
  form.set("file", new Blob([new Uint8Array(params.audio)]), params.filename);
  const res = await fetch(`${env.AI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.AI_API_KEY}` },
    signal: AbortSignal.timeout(AI_AUDIO_TIMEOUT_MS),
    body: form,
  });
  if (!res.ok) throw new Error(`STT ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { text: string };
  // Approximation du coût STT : Whisper est facturé ~0,006 $/min.
  // On estime la durée audio depuis la taille du buffer (codec webm/opus ≈ 32 kbps).
  const estimatedSeconds = Math.ceil((params.audio.length * 8) / 32_000);
  await logUsage({
    userId: params.userId ?? null,
    kind: "stt",
    model: env.STT_MODEL,
    inputTokens: estimatedSeconds, // "tokens" utilisés comme unité secondes ici
    outputTokens: 0,
    latencyMs: Date.now() - start,
    success: true,
  });
  return data.text;
}
