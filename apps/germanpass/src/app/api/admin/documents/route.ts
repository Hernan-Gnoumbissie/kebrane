import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { detectMime, saveFile, MAX_DOCUMENT_BYTES } from "@/lib/storage";
import { enqueue } from "@/lib/queue";
import { audit } from "@/lib/audit";

/** Upload d'un document dans la bibliothèque RAG (PDF/DOCX/TXT). */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    const level = form.get("level")?.toString() || null;
    if (!(file instanceof File)) {
      return Response.json({ error: { code: "NO_FILE", message: "Fichier manquant" } }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectMime(buffer);

    let mime: string;
    let ext: string;
    if (detected?.kind === "pdf") {
      mime = "application/pdf";
      ext = "pdf";
    } else if (detected?.kind === "docx") {
      // Vérification magic bytes (PK zip) + extension .docx pour distinguer DOCX d'autres ZIP
      if (!file.name.toLowerCase().endsWith(".docx")) {
        return Response.json(
          { error: { code: "BAD_FILE_TYPE", message: "Formats acceptés : PDF, DOCX, TXT, MD" } },
          { status: 400 }
        );
      }
      mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else if (detected?.kind === "text") {
      const nameLower = file.name.toLowerCase();
      if (!nameLower.endsWith(".txt") && !nameLower.endsWith(".md")) {
        return Response.json(
          { error: { code: "BAD_FILE_TYPE", message: "Formats acceptés : PDF, DOCX, TXT, MD" } },
          { status: 400 }
        );
      }
      mime = "text/plain";
      ext = "txt";
    } else {
      return Response.json(
        { error: { code: "BAD_FILE_TYPE", message: "Formats acceptés : PDF, DOCX, TXT, MD" } },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      return Response.json(
        { error: { code: "TOO_LARGE", message: "Fichier trop volumineux (max 100 Mo)" } },
        { status: 413 }
      );
    }

    const filePath = await saveFile(buffer, "documents", ext);
    const doc = await db.document.create({
      data: {
        title: file.name,
        filePath,
        mimeType: mime,
        fileSize: buffer.length,
        level: (level as never) || null,
        uploadedById: admin.id,
      },
    });
    await enqueue({ type: "ingest_document", documentId: doc.id });
    await audit({ actorId: admin.id, action: "document.upload", targetType: "Document", targetId: doc.id });
    return Response.json({ ok: true, documentId: doc.id }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const documents = await db.document.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
    return Response.json({ documents });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
