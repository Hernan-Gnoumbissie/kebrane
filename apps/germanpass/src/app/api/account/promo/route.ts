import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { computeNewAccessUntil } from "@/lib/account";
import { audit } from "@/lib/audit";

const schema = z.object({ code: z.string().min(3).max(50) });

/** Échange d'un code promo contre des jours d'accès. */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const rl = await rateLimit(`promo:${user.id}`, 10, 3600);
    if (!rl.allowed) {
      return Response.json({ error: { code: "RATE_LIMITED", message: "Trop de tentatives" } }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", message: "Code invalide" } }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const promo = await tx.promoCode.findUnique({ where: { code: parsed.data.code } });
      if (!promo || !promo.active) return { error: "INVALID" as const };
      if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { error: "EXPIRED" as const };
      if (promo.usedCount >= promo.maxUses) return { error: "EXHAUSTED" as const };

      const already = await tx.promoRedemption.findUnique({
        where: { promoCodeId_userId: { promoCodeId: promo.id, userId: user.id } },
      });
      if (already) return { error: "ALREADY_USED" as const };

      await tx.promoRedemption.create({ data: { promoCodeId: promo.id, userId: user.id } });
      await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });

      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      const newUntil = computeNewAccessUntil(fresh.accessUntil, promo.daysGranted);
      await tx.user.update({
        where: { id: user.id },
        data: { status: "ACTIVE", accessUntil: newUntil },
      });
      return { ok: true as const, days: promo.daysGranted, accessUntil: newUntil };
    });

    if ("error" in result) {
      const messages: Record<string, string> = {
        INVALID: "Code inconnu ou inactif",
        EXPIRED: "Code expiré",
        EXHAUSTED: "Code épuisé",
        ALREADY_USED: "Code déjà utilisé sur ce compte",
      };
      const code: string = result.error ?? "INVALID";
      return Response.json(
        { error: { code, message: messages[code] ?? "Code invalide" } },
        { status: 400 }
      );
    }

    await audit({
      actorId: user.id,
      action: "promo.redeem",
      targetType: "User",
      targetId: user.id,
      metadata: { code: parsed.data.code, days: result.days },
    });

    return Response.json({ ok: true, days: result.days, accessUntil: result.accessUntil.toISOString() });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
