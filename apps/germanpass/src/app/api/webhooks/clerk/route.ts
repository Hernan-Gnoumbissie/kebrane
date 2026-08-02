import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { scheduleMarketingSequence } from "@/lib/marketing";
import { syncKebraneAccessInBackground } from "@/lib/kebrane";

/**
 * Webhook Clerk — synchronise les événements Clerk vers la base métier.
 *
 * Événements traités :
 *  - user.created   : upsert de l'utilisateur métier. Si un compte existe déjà
 *                     pour cet email (migration / liaison Google), on le relie
 *                     (clerkUserId). Sinon on crée un compte au statut PENDING
 *                     (validation admin conservée) et on planifie le marketing.
 *  - session.created: pose `activeSessionId` = dernière session Clerk
 *                     (session unique anti-partage ; les guards invalident le reste).
 *  - user.deleted   : délie le compte (clerkUserId = null).
 *
 * Sécurité : verifyWebhook() lit CLERK_WEBHOOK_SIGNING_SECRET et rejette toute
 * signature invalide. Cette route doit rester PUBLIQUE (non couverte par le proxy).
 */

type ClerkEmail = { id: string; email_address: string };
type ClerkExternalAccount = { provider?: string; provider_user_id?: string };

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
    console.error("[clerk-webhook] signature invalide :", err);
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
          external_accounts?: ClerkExternalAccount[];
        };
        const clerkUserId = data.id;
        const email = pickPrimaryEmail(data);
        if (!email) {
          console.warn("[clerk-webhook] user.created sans email :", clerkUserId);
          break;
        }
        const name =
          [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
          email.split("@")[0] ||
          "Nutzer";
        const googleId =
          data.external_accounts?.find((a) => a.provider === "oauth_google")
            ?.provider_user_id ?? null;

        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
          // Compte déjà présent (migré ou créé auparavant) : on le relie à Clerk.
          if (existing.status === "DELETED" || existing.status === "SUSPENDED") break;
          const linked = await db.user.update({
            where: { id: existing.id },
            data: {
              clerkUserId,
              googleId: existing.googleId ?? googleId,
              emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            },
          });
          // Compte Kebrane + miroir de l'accès produit (KB-08).
          syncKebraneAccessInBackground(linked);
        } else {
          const created = await db.user.create({
            data: {
              email,
              name,
              clerkUserId,
              googleId,
              status: "PENDING",
              emailVerifiedAt: new Date(),
            },
          });
          void scheduleMarketingSequence(created.id).catch((e) =>
            console.error("[clerk-webhook] planification marketing échouée :", e)
          );
          syncKebraneAccessInBackground(created);
        }
        break;
      }

      case "session.created": {
        const data = evt.data as { id: string; user_id: string };
        // Session unique : la nouvelle session devient la seule valide.
        await db.user.updateMany({
          where: { clerkUserId: data.user_id },
          data: { activeSessionId: data.id },
        });
        break;
      }

      case "user.deleted": {
        const data = evt.data as { id: string };
        await db.user.updateMany({
          where: { clerkUserId: data.id },
          data: { clerkUserId: null },
        });
        break;
      }

      default:
        // Événements non traités : ignorés silencieusement.
        break;
    }
  } catch (err) {
    console.error(`[clerk-webhook] échec traitement ${evt.type} :`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
