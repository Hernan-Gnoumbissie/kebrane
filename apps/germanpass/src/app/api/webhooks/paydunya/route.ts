import type { NextRequest } from "next/server";
import { billing } from "@kebrane/core";
import { ensurePaymentProviders, PAYDUNYA } from "@/lib/payments";

/**
 * IPN PayDunya (KB-13) — notification serveur-à-serveur de l'état d'un paiement.
 *
 * PayDunya poste vers cette URL (le `callback_url` de la facture) avec des clés
 * imbriquées façon PHP : `data[status]`, `data[hash]`, `data[invoice][token]`,
 * `data[custom_data][plan]`… On reconstruit l'objet imbriqué, puis on délègue
 * TOUT à `billing.handleWebhook` : c'est l'adaptateur PayDunya qui vérifie
 * l'authenticité (SHA-512 de la MASTER-KEY) et interprète le statut, et c'est
 * `billing` — et lui seul — qui ouvre l'accès, de façon idempotente.
 *
 * ⚠ Doit rester PUBLIQUE : aucune règle de `src/proxy.ts` ne vise
 * /api/webhooks/paydunya (cf. `isProtected`). Ne rien y ajouter qui exige Clerk.
 *
 * Contrat de réponse :
 *  - 200 : reçu (y compris notification ignorée — hash invalide, ou statut neutre).
 *  - 400 : corps illisible.
 *  - 500 : échec de traitement (Core/base indisponible) → PayDunya réessaiera,
 *          sans danger car `billing.confirm` est idempotent.
 */

/** Reconstruit `{ data: { invoice: { token } } }` depuis des clés `data[invoice][token]`. */
function parseBracketed(params: URLSearchParams): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [rawKey, value] of params.entries()) {
    const segments = rawKey
      .replace(/\]/g, "")
      .split("[")
      .filter((s) => s.length > 0);
    let node: Record<string, unknown> = root;
    segments.forEach((seg, i) => {
      if (i === segments.length - 1) {
        node[seg] = value;
      } else {
        if (typeof node[seg] !== "object" || node[seg] === null) node[seg] = {};
        node = node[seg] as Record<string, unknown>;
      }
    });
  }
  return root;
}

export async function POST(req: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    const ctype = req.headers.get("content-type") ?? "";
    if (ctype.includes("application/json")) {
      payload = await req.json();
    } else {
      // Couvre application/x-www-form-urlencoded ET multipart/form-data.
      const form = await req.formData();
      const params = new URLSearchParams();
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") params.append(key, value);
      }
      payload = parseBracketed(params);
    }
  } catch (err) {
    console.error("[paydunya-ipn] corps illisible :", err);
    return new Response("Bad request", { status: 400 });
  }

  try {
    await ensurePaymentProviders();
    await billing.handleWebhook(PAYDUNYA, payload);
  } catch (err) {
    console.error("[paydunya-ipn] échec de traitement :", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
