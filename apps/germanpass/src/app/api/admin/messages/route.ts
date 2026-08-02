import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

/** Liste des messages de contact (support + retours). */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const onlyOpen = url.searchParams.get("open") === "1";
    const messages = await db.contactMessage.findMany({
      where: onlyOpen ? { handled: false } : {},
      orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
      take: 200,
    });
    return Response.json({ messages });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

const patchSchema = z.object({ id: z.string().min(1), handled: z.boolean() });

/** Marque un message comme traité / non traité. */
export async function PATCH(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });
    }
    await db.contactMessage.update({ where: { id: parsed.data.id }, data: { handled: parsed.data.handled } });
    await audit({ actorId: admin.id, action: "contact.handle", targetType: "ContactMessage", targetId: parsed.data.id, metadata: { handled: parsed.data.handled } });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
