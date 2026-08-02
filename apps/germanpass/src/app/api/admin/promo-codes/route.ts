import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Za-z0-9_-]+$/),
  daysGranted: z.coerce.number().int().positive().max(3650),
  maxUses: z.coerce.number().int().positive().max(100000).default(1),
  expiresAt: z.coerce.date().optional(),
});

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const codes = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ codes });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }
    const code = await db.promoCode.create({ data: parsed.data });
    await audit({ actorId: admin.id, action: "promo.create", targetType: "PromoCode", targetId: code.id });
    return Response.json({ code }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
