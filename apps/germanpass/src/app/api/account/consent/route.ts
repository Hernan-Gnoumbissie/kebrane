import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const schema = z.object({ audioConsent: z.boolean() });

/** État actuel du consentement audio. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    return Response.json({ audioConsent: user.audioConsentAt !== null });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Consentement RGPD pour l'enregistrement audio (Sprechen), révocable. */
export async function PATCH(req: Request): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });
    }
    await db.user.update({
      where: { id: user.id },
      data: { audioConsentAt: parsed.data.audioConsent ? new Date() : null },
    });
    await audit({
      actorId: user.id,
      action: parsed.data.audioConsent ? "consent.audio.grant" : "consent.audio.revoke",
      targetType: "User",
      targetId: user.id,
    });
    return Response.json({ ok: true, audioConsent: parsed.data.audioConsent });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
