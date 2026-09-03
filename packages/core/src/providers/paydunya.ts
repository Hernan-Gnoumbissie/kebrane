// @kebrane/core — adaptateur PayDunya pour le module `billing` (KB-13).
//
// PayDunya est un agrégateur de paiement (Dakar/Douala) qui expose une PAGE DE
// PAIEMENT HÉBERGÉE : c'est le payeur qui, sur cette page, choisit son canal
// (MTN MoMo, Orange Money…). Retenu le 2 septembre 2026 en remplacement de KPay,
// lequel exigeait une structure immatriculée et une vérification par URL —
// incompatibles avec un entrepreneur individuel non enregistré. L'intégration
// reprend le flux déjà éprouvé dans le produit « Permis Cameroun »
// (Prepa/services/paydunyaService.js) : `checkout-invoice/create` pour ouvrir la
// facture, l'IPN pour la notification d'état.
//
// Ce fichier ne fait que TRADUIRE l'API PayDunya vers l'interface
// `PaymentProvider`. Toute la logique métier — persistance, idempotence,
// ouverture de l'accès, journal comptable — reste dans `billing` et n'est pas
// réécrite ici. C'est la règle posée par KB-13 : changer de PSP = un adaptateur,
// rien d'autre.
import crypto from "node:crypto";
import {
  PaymentChannel,
  PaymentStatus,
  type CollectionRequest,
  type CollectionResult,
  type PaymentProvider,
  type WebhookResult,
} from "../billing";

export const PAYDUNYA_PROVIDER_NAME = "paydunya";

export interface PayDunyaConfig {
  masterKey: string;
  privateKey: string;
  token: string;
  /** "live" vise l'API de production ; toute autre valeur vise le bac à sable. */
  mode?: "live" | "test";
  /** Page de retour après paiement réussi (côté produit ou hub). */
  returnUrl: string;
  /** Page de retour si le payeur annule. */
  cancelUrl: string;
  /** URL de l'IPN Kebrane où PayDunya notifie l'état (POST form-urlencoded). */
  callbackUrl: string;
  /** Nom/accroche affichés sur la page de paiement hébergée. */
  storeName?: string;
  storeTagline?: string;
  /** Injectable pour les tests ; par défaut le `fetch` global (Node ≥ 18). */
  fetchImpl?: typeof fetch;
}

/** Réponse de `checkout-invoice/create`. `response_code === "00"` = succès. */
interface CreateInvoiceResponse {
  response_code?: string;
  response_text?: string; // succès : l'URL de paiement ; échec : le message.
  token?: string;
  description?: string;
}

function baseUrl(mode: PayDunyaConfig["mode"]): string {
  return mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";
}

function headers(config: PayDunyaConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": config.masterKey,
    "PAYDUNYA-PRIVATE-KEY": config.privateKey,
    "PAYDUNYA-TOKEN": config.token,
  };
}

/**
 * PayDunya signe ses IPN avec le SHA-512 de la MASTER-KEY, renvoyé dans
 * `data[hash]`. On le recalcule et on compare en temps constant : une
 * notification dont le hash ne colle pas n'est PAS de PayDunya et doit être
 * ignorée (retour `null`), jamais traitée comme un échec de paiement.
 */
function hashMatches(config: PayDunyaConfig, received: unknown): boolean {
  if (typeof received !== "string" || received.length === 0) return false;
  const expected = crypto.createHash("sha512").update(config.masterKey).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Traduit le statut PayDunya vers le vocabulaire de `billing`. */
function toPaymentStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "completed":
      return PaymentStatus.CONFIRMED;
    case "cancelled":
    case "failed":
      return PaymentStatus.FAILED;
    default:
      // "pending" ou statut inconnu : on n'ouvre ni ne ferme rien.
      return PaymentStatus.PENDING;
  }
}

/** Lecture défensive d'un chemin imbriqué dans la charge utile de l'IPN. */
function pick(obj: unknown, ...path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/**
 * Construit un adaptateur PayDunya à partir d'une configuration explicite.
 * Préférée pour les tests ; en production on passe par `payDunyaFromEnv()`.
 */
export function createPayDunyaProvider(config: PayDunyaConfig): PaymentProvider {
  const doFetch = config.fetchImpl ?? fetch;

  return {
    name: PAYDUNYA_PROVIDER_NAME,
    // ⚠ Au Cameroun, PayDunya ne couvre QUE MTN MoMo — Orange Money Cameroun
    // n'est pas proposé (constaté le 2 sept. 2026 sur le tableau de bord). Orange
    // Money reste donc encaissé par le filet manuel (manual-proof) en attendant
    // un second agrégateur. La carte et PayPal, s'ils viennent, seront un autre
    // adaptateur : on n'annonce ici que ce que PayDunya encaisse réellement.
    channels: [PaymentChannel.MTN_MOMO],

    async createCollection(request: CollectionRequest): Promise<CollectionResult> {
      // Le XAF n'a pas de sous-unité : `amount` est déjà en francs entiers.
      const amount = request.amount;
      const label = `${request.productSlug} — ${request.plan}`;

      const res = await doFetch(`${baseUrl(config.mode)}/checkout-invoice/create`, {
        method: "POST",
        headers: headers(config),
        body: JSON.stringify({
          invoice: {
            items: {
              item_0: { name: label, quantity: 1, unit_price: amount, total_price: amount },
            },
            taxes: {},
            total_amount: amount,
            description: label,
          },
          store: {
            name: config.storeName ?? "Kebrane",
            tagline: config.storeTagline ?? "Un compte Kebrane, tous les produits.",
          },
          actions: {
            cancel_url: config.cancelUrl,
            return_url: config.returnUrl,
            callback_url: config.callbackUrl,
          },
          // Échos renvoyés dans l'IPN — utiles au support et au débogage. La
          // décision d'ouverture d'accès, elle, ne s'appuie QUE sur le token
          // (providerRef), corrélé à la ligne persistée par `billing`.
          custom_data: {
            account_id: request.accountId,
            product_slug: request.productSlug,
            plan: request.plan,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`PayDunya: création de facture HTTP ${res.status}`);
      }
      const data = (await res.json()) as CreateInvoiceResponse;
      if (data.response_code !== "00" || !data.token) {
        throw new Error(data.response_text || "PayDunya: échec de création de la facture.");
      }

      // Le token EST la référence fournisseur : c'est lui qui porte l'idempotence
      // (couple provider + providerRef) et que l'IPN renverra. On reste EN
      // ATTENTE — un paiement demandé n'est pas un paiement reçu.
      return {
        providerRef: data.token,
        status: PaymentStatus.PENDING,
        redirectUrl: data.response_text, // l'URL de la page de paiement hébergée
        metadata: { mode: config.mode ?? "test" },
      };
    },

    async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
      // L'IPN PayDunya poste du form-urlencoded imbriqué (`data[...]`). La route
      // Kebrane le décode en objet et nous le passe tel quel sous `data`.
      const data = pick(payload, "data") ?? payload;

      // Authenticité d'abord : sans hash valide, ce n'est pas PayDunya.
      if (!hashMatches(config, pick(data, "hash"))) return null;

      const providerRef = pick(data, "invoice", "token") ?? pick(data, "token");
      if (typeof providerRef !== "string" || providerRef.length === 0) return null;

      return {
        providerRef,
        status: toPaymentStatus(pick(data, "status")),
        metadata: { mode: config.mode ?? "test" },
      };
    },
  };
}

/**
 * Construit l'adaptateur depuis l'environnement. Renvoie `null` si les clés
 * manquent — de sorte que le bootstrap d'une app puisse décider de ne PAS
 * enregistrer PayDunya (et de rester sur le filet manuel) sans planter au
 * démarrage. Variables attendues :
 *
 *   PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY, PAYDUNYA_TOKEN
 *   PAYDUNYA_MODE            "live" | "test" (défaut : test)
 *   PAYDUNYA_RETURN_URL, PAYDUNYA_CANCEL_URL, PAYDUNYA_CALLBACK_URL
 *   PAYDUNYA_STORE_NAME, PAYDUNYA_STORE_TAGLINE   (optionnelles)
 */
export function payDunyaFromEnv(env: NodeJS.ProcessEnv = process.env): PaymentProvider | null {
  const masterKey = env.PAYDUNYA_MASTER_KEY;
  const privateKey = env.PAYDUNYA_PRIVATE_KEY;
  const token = env.PAYDUNYA_TOKEN;
  const returnUrl = env.PAYDUNYA_RETURN_URL;
  const cancelUrl = env.PAYDUNYA_CANCEL_URL;
  const callbackUrl = env.PAYDUNYA_CALLBACK_URL;

  if (!masterKey || !privateKey || !token || !returnUrl || !cancelUrl || !callbackUrl) {
    return null;
  }

  return createPayDunyaProvider({
    masterKey,
    privateKey,
    token,
    mode: env.PAYDUNYA_MODE === "live" ? "live" : "test",
    returnUrl,
    cancelUrl,
    callbackUrl,
    storeName: env.PAYDUNYA_STORE_NAME,
    storeTagline: env.PAYDUNYA_STORE_TAGLINE,
  });
}
