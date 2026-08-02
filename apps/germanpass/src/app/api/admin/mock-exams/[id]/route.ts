import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const schema = z.object({ isPublished: z.boolean() });

/** Publication / dépublication d'un examen blanc. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION" } }, { status: 400 });
    }
    const exam = await db.mockExam.update({ where: { id }, data: { isPublished: parsed.data.isPublished } });
    await audit({
      actorId: admin.id,
      action: parsed.data.isPublished ? "mock_exam.publish" : "mock_exam.unpublish",
      targetType: "MockExam",
      targetId: id,
    });
    return Response.json({ exam });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
