import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";

/** File des preuves en attente (admin). */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "PENDING";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = 20;

    const where = { status: status as "PENDING" | "APPROVED" | "REJECTED" };
    const [proofs, total] = await Promise.all([
      db.paymentProof.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, email: true, name: true, status: true, accessUntil: true } } },
      }),
      db.paymentProof.count({ where }),
    ]);
    return Response.json({ proofs, total, page, pageSize });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
