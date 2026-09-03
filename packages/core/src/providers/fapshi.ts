// @kebrane/core — adaptateur Fapshi pour le module `billing` (KB-13).
//
// Fapshi (Cameroun) est retenu le 3 septembre 2026 comme agrégateur UNIQUE, en
// remplacement de PayDunya : vérifié à la source, il couvre **MTN MoMo ET Orange
// Money** au Cameroun (paramètre `medium` = "mobile money" | "orange money") et
// accepte explicitement une activité **informelle / non enregistrée**. PayDunya,
// lui, ne couvrait que MTN au Cameroun. L'adaptateur PayDunya reste au dépôt,
// mis de côté (non enregistré au bootstrap).
//
// Comme pour tout adaptateur (KB-13), ce fichier ne fait que TRADUIRE l'API
// Fapshi vers l'interface `PaymentProvider`. Idempotence, ouverture d'accès et
// journal restent dans `billing`, jamais réécrits ici.
//
// Sécurité du webhook — anti-spoof : Fapshi n'envoie qu'UNE notification par
// événement et son corps n'est pas signé (un secret d'en-tête `x-wh-secret` est
// optionnel, vérifié côté route). On ne se fie donc PAS au statut du corps : à
// réception, l'adaptateur **re-interroge `GET /payment-status/{transId}`**
// (authentifié par les clés) et ne retient QUE ce statut faisant autorité. Un
// faux webhook ne peut ainsi jamais ouvrir un accès.
import {
  PaymentChannel,
  PaymentStatus,
  type CollectionRequest,
  type CollectionResult,
  type PaymentProvider,
  type WebhookResult,
} from "../billing";

export const FAPSHI_PROVIDER_NAME = "fapshi";

export interface FapshiConfig {
  /** `apikey` du tableau de bord Fapshi (par service). */
  apiKey: string;
  /** `apiuser` du tableau de bord Fapshi (par service). */
  apiUser: string;
  /** "live" vise l'API de production ; toute autre valeur vise le bac à sable. */
  mode?: "live" | "sandbox";
  /** URL où renvoyer le payeur après paiement (page produit/hub). */
  redirectUrl?: string;
  /** Injectable pour les tests ; par défaut le `fetch` global (Node ≥ 18). */
  fetchImpl?: typeof fetch;
}

/** Corps de `payment-status` (et du webhook, identique). Champs utiles seulement. */
interface FapshiStatus {
  transId?: string;
  status?: "CREATED" | "PENDING" | "SUCCESSFUL" | "FAILED" | "EXPIRED";
  medium?: string;
  amount?: number;
  externalId?: string;
  userId?: string;
}

function baseUrl(mode: FapshiConfig["mode"]): string {
  return mode === "live" ? "https://live.fapshi.com" : "https://sandbox.fapshi.com";
}

function headers(config: FapshiConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: config.apiKey,
    apiuser: config.apiUser,
  };
}

/** Traduit le statut Fapshi vers le vocabulaire de `billing`. */
function toPaymentStatus(status: FapshiStatus["status"]): PaymentStatus {
  switch (status) {
    case "SUCCESSFUL":
      return PaymentStatus.CONFIRMED;
    case "FAILED":
    case "EXPIRED":
      return PaymentStatus.FAILED;
    default:
      // CREATED / PENDING / inconnu : on n'ouvre ni ne ferme rien.
      return PaymentStatus.PENDING;
  }
}

/** `userId` Fapshi doit matcher ^[a-zA-Z0-9-_]{1,100}$ ; sinon on l'omet. */
function safeUserId(accountId: string): string | undefined {
  return /^[a-zA-Z0-9\-_]{1,100}$/.test(accountId) ? accountId : undefined;
}

/**
 * Construit un adaptateur Fapshi à partir d'une configuration explicite.
 * Préférée pour les tests ; en production on passe par `fapshiFromEnv()`.
 */
export function createFapshiProvider(config: FapshiConfig): PaymentProvider {
  const doFetch = config.fetchImpl ?? fetch;

  return {
    name: FAPSHI_PROVIDER_NAME,
    // Fapshi couvre les deux canaux au Cameroun (vérifié le 3 sept. 2026). Le
    // payeur choisit son opérateur sur la page hébergée ; on annonce donc les
    // deux ici. La carte/PayPal, s'ils viennent, seront un autre adaptateur.
    channels: [PaymentChannel.MTN_MOMO, PaymentChannel.ORANGE_MONEY],

    async createCollection(request: CollectionRequest): Promise<CollectionResult> {
      // Le XAF n'a pas de sous-unité : `amount` est déjà en francs entiers.
      // Fapshi impose un minimum de 100 XAF (nos offres sont bien au-dessus).
      const userId = safeUserId(request.accountId);
      const res = await doFetch(`${baseUrl(config.mode)}/initiate-pay`, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({
          amount: request.amount,
          message: `${request.productSlug} — ${request.plan}`,
          ...(userId ? { userId } : {}),
          ...(config.redirectUrl ? { redirectUrl: config.redirectUrl } : {}),
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Fapshi: initiate-pay HTTP ${res.status} ${detail.slice(0, 200)}`);
      }
      const data = (await res.json()) as { link?: string; transId?: string; message?: string };
      if (!data.transId || !data.link) {
        throw new Error(data.message || "Fapshi: réponse initiate-pay incomplète.");
      }

      // `transId` EST la référence fournisseur : il porte l'idempotence (couple
      // provider + providerRef) et revient dans le webhook. On reste EN ATTENTE.
      return {
        providerRef: data.transId,
        status: PaymentStatus.PENDING,
        redirectUrl: data.link, // page de paiement hébergée Fapshi (expire à 24 h)
        metadata: { mode: config.mode ?? "sandbox" },
      };
    },

    async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
      // On lit UNIQUEMENT le transId du corps ; le statut du corps n'est pas de
      // confiance (non signé). On va chercher le statut faisant autorité.
      const transId =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).transId
          : undefined;
      if (typeof transId !== "string" || transId.length === 0) return null;

      const res = await doFetch(`${baseUrl(config.mode)}/payment-status/${encodeURIComponent(transId)}`, {
        method: "GET",
        headers: headers(config),
      });
      if (!res.ok) {
        // On ne confirme JAMAIS sur une vérification qui a échoué : rater une
        // confirmation est rattrapable (support / réconciliation), l'inverse non.
        throw new Error(`Fapshi: payment-status HTTP ${res.status} pour ${transId}`);
      }
      const status = (await res.json()) as FapshiStatus;

      return {
        providerRef: transId,
        status: toPaymentStatus(status.status),
        metadata: { medium: status.medium, mode: config.mode ?? "sandbox" },
      };
    },
  };
}

/**
 * Construit l'adaptateur depuis l'environnement. Renvoie `null` si les clés
 * manquent — le bootstrap d'une app peut alors décider de rester sur le filet
 * manuel sans planter au démarrage. Variables attendues :
 *
 *   FAPSHI_API_KEY, FAPSHI_API_USER
 *   FAPSHI_MODE          "live" | "sandbox" (défaut : sandbox)
 *   FAPSHI_REDIRECT_URL  page de retour du payeur (optionnelle)
 *
 * Le secret de webhook (`x-wh-secret`) est vérifié CÔTÉ ROUTE, pas ici :
 * l'adaptateur, lui, re-interroge le statut et n'en dépend pas.
 */
export function fapshiFromEnv(env: NodeJS.ProcessEnv = process.env): PaymentProvider | null {
  const apiKey = env.FAPSHI_API_KEY;
  const apiUser = env.FAPSHI_API_USER;
  if (!apiKey || !apiUser) return null;

  return createFapshiProvider({
    apiKey,
    apiUser,
    mode: env.FAPSHI_MODE === "live" ? "live" : "sandbox",
    redirectUrl: env.FAPSHI_REDIRECT_URL,
  });
}
