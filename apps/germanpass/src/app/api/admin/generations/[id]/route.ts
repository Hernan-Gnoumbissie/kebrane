import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

const schema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approve") }),
  z.object({ decision: z.literal("reject"), reason: z.string().min(3).max(500) }),
]);

/** Validation humaine d'une génération : publie ou rejette le contenu créé. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }

    const gen = await db.aiGeneration.findUnique({ where: { id } });
    if (!gen) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    if (gen.status !== "PENDING_REVIEW") {
      return Response.json({ error: { code: "BAD_STATUS", message: "Génération non validable" } }, { status: 409 });
    }

    if (parsed.data.decision === "approve") {
      if (gen.targetType === "passage" && gen.resultId) {
        await db.passage.update({ where: { id: gen.resultId }, data: { status: "PUBLISHED" } });
        await db.question.updateMany({ where: { passageId: gen.resultId }, data: { status: "PUBLISHED" } });
      }
      if (gen.targetType === "lesson" && gen.resultId) {
        await db.lesson.update({ where: { id: gen.resultId }, data: { status: "PUBLISHED" } });
      }
      await db.aiGeneration.update({ where: { id }, data: { status: "APPROVED" } });
      await audit({ actorId: admin.id, action: "generation.approve", targetType: "AiGeneration", targetId: id });
      return Response.json({ ok: true });
    }

    if (gen.targetType === "passage" && gen.resultId) {
      await db.passage.update({ where: { id: gen.resultId }, data: { status: "REJECTED", archived: true } });
    }
    if (gen.targetType === "lesson" && gen.resultId) {
      await db.lesson.update({ where: { id: gen.resultId }, data: { status: "REJECTED" } });
    }
    await db.aiGeneration.update({
      where: { id },
      data: { status: "REJECTED", rejectReason: parsed.data.reason },
    });
    await audit({
      actorId: admin.id,
      action: "generation.reject",
      targetType: "AiGeneration",
      targetId: id,
      metadata: { reason: parsed.data.reason },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
