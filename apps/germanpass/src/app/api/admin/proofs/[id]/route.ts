import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { activateUser, ALLOWED_GRANT_DAYS } from "@/lib/account";
import { audit } from "@/lib/audit";
import { mailTemplates, sendMail } from "@/lib/mail";

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    days: z.coerce
      .number()
      .refine((d): d is (typeof ALLOWED_GRANT_DAYS)[number] =>
        (ALLOWED_GRANT_DAYS as readonly number[]).includes(d)
      ),
  }),
  z.object({ decision: z.literal("reject"), reason: z.string().min(3).max(500) }),
]);

/** Décision admin sur une preuve : approve (+7/+30/+90/+365 j) ou reject. */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const parsed = decisionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", message: "Données invalides", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const proof = await db.paymentProof.findUnique({ where: { id }, include: { user: true } });
    if (!proof) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Preuve introuvable" } }, { status: 404 });
    }
    if (proof.status !== "PENDING") {
      return Response.json(
        { error: { code: "ALREADY_REVIEWED", message: "Preuve déjà traitée" } },
        { status: 409 }
      );
    }

    if (parsed.data.decision === "approve") {
      const until = await activateUser({
        userId: proof.userId,
        days: parsed.data.days,
        adminId: admin.id,
        reason: `proof:${proof.id}`,
      });
      await db.paymentProof.update({
        where: { id },
        data: {
          status: "APPROVED",
          daysGranted: parsed.data.days,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });
      await audit({
        actorId: admin.id,
        action: "proof.approve",
        targetType: "PaymentProof",
        targetId: id,
        metadata: { days: parsed.data.days },
      });
      return Response.json({ ok: true, accessUntil: until.toISOString() });
    }

    await db.paymentProof.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: parsed.data.reason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    await audit({
      actorId: admin.id,
      action: "proof.reject",
      targetType: "PaymentProof",
      targetId: id,
      metadata: { reason: parsed.data.reason },
    });
    const tpl = mailTemplates.proofRejected(proof.user.name, parsed.data.reason);
    await sendMail(proof.user.email, tpl.subject, tpl.html).catch(() => undefined);
    return Response.json({ ok: true });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
