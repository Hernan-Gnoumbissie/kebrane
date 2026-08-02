import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { activateUser, ALLOWED_GRANT_DAYS } from "@/lib/account";
import { audit } from "@/lib/audit";
import { syncKebraneAccessInBackground } from "@/lib/kebrane";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("grant"),
    days: z.coerce
      .number()
      .refine((d): d is (typeof ALLOWED_GRANT_DAYS)[number] =>
        (ALLOWED_GRANT_DAYS as readonly number[]).includes(d)
      ),
  }),
  z.object({ action: z.literal("suspend"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("set_plan"), plan: z.enum(["FULL", "EXAM_PREP"]) }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id } });
    if (!user || user.status === "DELETED") {
      return Response.json({ error: { code: "NOT_FOUND", message: "Utilisateur introuvable" } }, { status: 404 });
    }

    switch (parsed.data.action) {
      case "grant": {
        const until = await activateUser({
          userId: id,
          days: parsed.data.days,
          adminId: admin.id,
          reason: "manual",
        });
        return Response.json({ ok: true, accessUntil: until.toISOString() });
      }
      case "suspend": {
        await db.user.update({ where: { id }, data: { status: "SUSPENDED" } });
        syncKebraneAccessInBackground({ ...user, status: "SUSPENDED" });
        await audit({
          actorId: admin.id,
          action: "user.suspend",
          targetType: "User",
          targetId: id,
          metadata: { reason: parsed.data.reason },
        });
        return Response.json({ ok: true });
      }
      case "set_plan": {
        await db.user.update({ where: { id }, data: { plan: parsed.data.plan } });
        syncKebraneAccessInBackground({ ...user, plan: parsed.data.plan });
        await audit({
          actorId: admin.id,
          action: "user.set_plan",
          targetType: "User",
          targetId: id,
          metadata: { plan: parsed.data.plan },
        });
        return Response.json({ ok: true });
      }
      case "unsuspend": {
        const stillValid = user.accessUntil && user.accessUntil.getTime() > Date.now();
        const restored = stillValid ? "ACTIVE" : "EXPIRED";
        await db.user.update({ where: { id }, data: { status: restored } });
        syncKebraneAccessInBackground({ ...user, status: restored });
        await audit({ actorId: admin.id, action: "user.unsuspend", targetType: "User", targetId: id });
        return Response.json({ ok: true });
      }
    }
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
