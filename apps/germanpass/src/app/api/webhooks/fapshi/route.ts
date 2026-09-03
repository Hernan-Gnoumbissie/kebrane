import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { billing, FAPSHI_PROVIDER_NAME } from "@kebrane/core";

/**
 * Webhook Fapshi (KB-13) — notification serveur-à-serveur d'un changement d'état.
 *
 * Fapshi POSTe ici (URL configurée « par service » sur le dashboard) un JSON
 * identique au corps de `payment-status`, uniquement quand le statut passe à
 * SUCCESSFUL, FAILED ou EXPIRED. ⚠ Une SEULE notification par événement, sans
 * réessai : le handler doit répondre vite et 200.
 *
 * Sécurité en deux temps :
 *  1. Ici, si `FAPSHI_WEBHOOK_SECRET` est défini, on exige le header
 *     `x-wh-secret` égal (comparaison à temps constant). Défense périmétrique.
 *  2. Surtout, l'adaptateur `fapshi` NE FAIT PAS confiance au statut du corps :
 *     il re-interroge `GET /payment-status/{transId}` (authentifié) et ne retient
 *     que ce statut. Un faux webhook ne peut donc pas ouvrir d'accès, secret ou pas.
 *
 * Doit rester PUBLIQUE : aucune règle de `src/proxy.ts` ne vise
 * /api/webhooks/fapshi (cf. `isProtected`).
 *
 * Réponses : 200 reçu · 400 corps illisible · 401 secret invalide · 500 échec
 * de traitement (l'ouverture d'accès par `billing.confirm` reste idempotente).
 */

function secretOk(req: NextRequest, expected: string | undefined): boolean {
  // Pas de secret configuré : on s'appuie sur la re-vérification serveur de
  // l'adaptateur (payment-status), qui suffit à écarter un faux webhook.
  if (!expected) return true;
  const got = req.headers.get("x-wh-secret") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!secretOk(req, process.env.FAPSHI_WEBHOOK_SECRET)) {
    return new Response("Invalid secret", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (err) {
    console.error("[fapshi-ipn] corps illisible :", err);
    return new Response("Bad request", { status: 400 });
  }

  try {
    await billing.handleWebhook(FAPSHI_PROVIDER_NAME, payload);
  } catch (err) {
    console.error("[fapshi-ipn] échec de traitement :", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
