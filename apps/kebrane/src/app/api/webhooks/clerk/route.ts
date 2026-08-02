import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { accounts } from "@kebrane/core";

/**
 * Webhook Clerk — côté COMPTE Kebrane (KB-17).
 *
 * Jusqu'ici le compte Core n'était créé que par le « lazy-link » de
 * `getKebraneSession()`, c'est-à-dire à la PREMIÈRE visite du hub. Un membre
 * qui s'inscrit puis file directement sur un produit n'avait donc pas encore
 * de compte Core. Ce webhook crée le compte dès l'inscription (eager) ;
 * le lazy-link reste le repli (dev sans tunnel, webhook perdu).
 *
 * Événements traités :
 *  - user.created : `accounts.getOrCreateForClerk` — crée le compte Core, ou
 *                   relie un compte existant trouvé par email (migration,
 *                   réinscription après déliaison).
 *  - user.deleted : `accounts.unlinkClerk` — délie SANS supprimer : l'historique
 *                   métier (accès produits, journal, facturation à venir) doit
 *                   survivre à la disparition de l'identité Clerk.
 *
 * Hors périmètre assumé : `session.created`. La session unique anti-partage
 * reste portée par GermanPass (c'est là qu'est le contenu payant) ; décision PO
 * du 2 août 2026 de ne pas la dupliquer sur le compte Kebrane lui-même.
 *
 * Sécurité : `verifyWebhook()` lit `CLERK_WEBHOOK_SIGNING_SECRET` et rejette
 * toute signature invalide. Cette route doit rester PUBLIQUE (aucune règle du
 * proxy ne la vise — voir `src/proxy.ts`).
 *
 * Robustesse : les deux handlers sont IDEMPOTENTS, donc un 500 (Core ou base
 * indisponible) est sans danger — Clerk réessaie. Et rien de tout cela ne
 * bloque le membre : l'inscription Clerk aboutit indépendamment, et le
 * lazy-link rattrape au premier passage sur le hub.
 */

type ClerkEmail = { id: string; email_address: string };

function pickPrimaryEmail(data: {
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
}): string | null {
  const list = data.email_addresses ?? [];
  const primary = list.find((e) => e.id === data.primary_email_address_id) ?? list[0];
  return primary?.email_address.toLowerCase() ?? null;
}

export async function POST(req: NextRequest): Promise<Response> {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[kebrane-clerk-webhook] signature invalide :", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created": {
        const data = evt.data as {
          id: string;
          email_addresses?: ClerkEmail[];
          primary_email_address_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
        };
        const email = pickPrimaryEmail(data);
        if (!email) {
          // Un compte Kebrane s'identifie par son email : sans email, pas de
          // création. Le lazy-link réessaiera quand Clerk en aura un.
          console.warn("[kebrane-clerk-webhook] user.created sans email :", data.id);
          break;
        }
        const name =
          [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
          email.split("@")[0] ||
          "Membre";

        await accounts.getOrCreateForClerk({ clerkUserId: data.id, email, name });
        break;
      }

      case "user.deleted": {
        const data = evt.data as { id: string };
        await accounts.unlinkClerk(data.id);
        break;
      }

      default:
        // Événements non traités : ignorés silencieusement (200 pour que Clerk
        // ne les remette pas en file).
        break;
    }
  } catch (err) {
    console.error(`[kebrane-clerk-webhook] échec traitement ${evt.type} :`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
