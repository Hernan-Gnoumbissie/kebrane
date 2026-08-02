import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { readStoredFile } from "@/lib/storage";

/**
 * Service de fichiers stockés hors webroot, avec contrôle d'accès :
 * - proofs/* : propriétaire ou admin
 * - audio/* (soumissions Sprechen) : propriétaire ou admin
 * - tts/*, stimuli/* : tout utilisateur actif
 * - documents/* (bibliothèque RAG) : admin uniquement
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  try {
    const user = await requireAuthenticated();
    const { path: parts } = await ctx.params;
    const relative = parts.join("/");
    const category = parts[0];

    const isAdmin = user.role === "ADMIN";

    if (category === "documents" && !isAdmin) {
      return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    if (category === "proofs" && !isAdmin) {
      const owned = await db.paymentProof.findFirst({
        where: { filePath: relative, userId: user.id },
        select: { id: true },
      });
      if (!owned) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    if (category === "audio" && !isAdmin) {
      const owned = await db.speakingSubmission.findFirst({
        where: { audioPath: relative, userId: user.id },
        select: { id: true },
      });
      if (!owned) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    }

    const { buffer } = await readStoredFile(relative);
    const ext = relative.split(".").pop()?.toLowerCase() ?? "";
    const mime: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      pdf: "application/pdf",
      webm: "audio/webm",
      ogg: "audio/ogg",
      mp3: "audio/mpeg",
      mpeg: "audio/mpeg",
    };
    // Fichiers sensibles (preuves, enregistrements Sprechen) : pas de cache.
    // Fichiers publics (TTS, stimuli) : cache privé 1 h acceptable.
    const isPrivate = category === "proofs" || category === "audio";
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime[ext] ?? "application/octet-stream",
        "Cache-Control": isPrivate ? "no-store" : "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
}
