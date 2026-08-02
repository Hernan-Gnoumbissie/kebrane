import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { detectMime, saveFile, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { audit } from "@/lib/audit";

const noteSchema = z.string().max(500).optional();

/** Upload d'une preuve de paiement (image ou PDF). */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const ip = getClientIp(req.headers);
    const rl = await rateLimit(`proof:${user.id}`, 5, 3600);
    if (!rl.allowed) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Trop d'envois, réessayez plus tard" } },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: { code: "NO_FILE", message: "Fichier manquant" } }, { status: 400 });
    }
    const note = noteSchema.parse(form.get("note")?.toString() || undefined);

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectMime(buffer);
    if (!detected || (detected.kind !== "image" && detected.kind !== "pdf")) {
      return Response.json(
        { error: { code: "BAD_FILE_TYPE", message: "Format accepté : JPEG, PNG, WEBP ou PDF" } },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_UPLOAD_BYTES[detected.kind]) {
      return Response.json({ error: { code: "TOO_LARGE", message: "Fichier trop volumineux" } }, { status: 413 });
    }

    const ext = detected.mime.split("/")[1] ?? "bin";
    const filePath = await saveFile(buffer, "proofs", ext);

    const proof = await db.paymentProof.create({
      data: {
        userId: user.id,
        filePath,
        mimeType: detected.mime,
        fileSize: buffer.length,
        note,
      },
    });

    await audit({
      actorId: user.id,
      action: "proof.upload",
      targetType: "PaymentProof",
      targetId: proof.id,
      ipAddress: ip,
    });

    return Response.json({ ok: true, proofId: proof.id, status: proof.status }, { status: 201 });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}

/** Liste de mes preuves. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const proofs = await db.paymentProof.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        daysGranted: true,
        rejectReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
    return Response.json({ proofs });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
