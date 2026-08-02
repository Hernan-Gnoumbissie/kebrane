import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

/** Profil de l'utilisateur connecté : identité, objectif d'examen, parcours, accès. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    return Response.json(
      {
        profile: {
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          accessUntil: user.accessUntil,
          targetProvider: user.targetProvider,
          targetLevel: user.targetLevel,
          currentLevel: user.currentLevel,
          plan: user.plan,
          nativeLang: user.localePref === "en" ? "en" : "fr",
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

const patchSchema = z.object({
  targetProvider: z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"]).nullable(),
  targetLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).nullable(),
  nativeLang: z.enum(["fr", "en"]).optional(),
});

/** Mise à jour de l'objectif d'examen (le plan est géré par l'admin). */
export async function PATCH(req: Request): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });
    }
    await db.user.update({
      where: { id: user.id },
      data: {
        targetProvider: parsed.data.targetProvider,
        targetLevel: parsed.data.targetLevel,
        ...(parsed.data.nativeLang ? { localePref: parsed.data.nativeLang } : {}),
      },
    });
    await audit({
      actorId: user.id,
      action: "profile.target.update",
      targetType: "User",
      targetId: user.id,
      metadata: parsed.data,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
