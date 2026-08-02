import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const schema = z.object({ confirm: z.literal("SUPPRIMER") });

/**
 * Suppression de compte RGPD : soft-delete + anonymisation immédiate des
 * données d'identification. Les contenus pédagogiques (tentatives, soumissions)
 * sont conservés de façon dissociée jusqu'à purge.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireAuthenticated();

    if (user.role === "ADMIN") {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "Un administrateur ne peut pas supprimer son propre compte ici." } },
        { status: 403 }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", message: "Confirmation requise (tapez SUPPRIMER)." } },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: `deleted-${user.id}@deleted.invalid`,
        name: "Compte supprimé",
        passwordHash: null,
        googleId: null,
        audioConsentAt: null,
      },
    });

    await audit({
      actorId: user.id,
      action: "account.delete",
      targetType: "User",
      targetId: user.id,
    });

    return Response.json({ ok: true });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
