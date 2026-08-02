import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url     = new URL(req.url);
    const section = url.searchParams.get("section");
    const level   = url.searchParams.get("level");
    const status  = url.searchParams.get("status");

    const passages = await db.passage.findMany({
      where: {
        archived: false,
        ...(section ? { section: section as never } : {}),
        ...(level   ? { level: level as never }     : {}),
        ...(status  ? { status: status as never }   : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        section: true,
        level: true,
        taskFormat: true,
        status: true,
        sourceOrigin: true,
        audioPath: true,
        createdAt: true,
        providers: { select: { provider: true } },
        _count: { select: { questions: true } },
      },
    });

    return Response.json({ passages });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

const patchSchema = z.object({
  action: z.enum(["publish", "archive", "unpublish"]),
});

export async function PATCH(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const id  = url.searchParams.get("id");
    if (!id) return Response.json({ error: { code: "MISSING_ID" } }, { status: 400 });

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });

    const { action } = parsed.data;
    await db.passage.update({
      where: { id },
      data: {
        ...(action === "publish"   ? { status: "PUBLISHED", archived: false } : {}),
        ...(action === "unpublish" ? { status: "DRAFT" }                      : {}),
        ...(action === "archive"   ? { archived: true }                       : {}),
      },
    });

    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
