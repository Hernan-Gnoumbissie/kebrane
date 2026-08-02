import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { env } from "@/lib/env";

export type AllowedKind = "image" | "pdf" | "audio" | "docx" | "text";

/** Détection par magic-bytes — la seule source de vérité (jamais le Content-Type client). */
export function detectMime(buffer: Buffer): { kind: AllowedKind; mime: string } | null {
  if (buffer.length < 12) return null;
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: "image", mime: "image/jpeg" };
  }
  // PNG
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: "image", mime: "image/png" };
  }
  // WEBP : RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { kind: "image", mime: "image/webp" };
  }
  // PDF
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { kind: "pdf", mime: "application/pdf" };
  }
  // WebM (EBML) — audio Sprechen (webm/opus)
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { kind: "audio", mime: "audio/webm" };
  }
  // OGG (opus)
  if (buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return { kind: "audio", mime: "audio/ogg" };
  }
  // MP3 : ID3 ou frame sync
  if (
    buffer.subarray(0, 3).toString("ascii") === "ID3" ||
    (buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0)
  ) {
    return { kind: "audio", mime: "audio/mpeg" };
  }
  // DOCX / XLSX / PPTX = ZIP (PK\x03\x04) — on affine via signature OOXML dans les métadonnées
  // Pour les documents RAG on n'accepte que DOCX (confirmé par extension côté appelant)
  if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    return { kind: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  // TXT/MD : pas de magic bytes fiables, mais on refuse les bytes null (binaire)
  // Vérification défensive sur les 512 premiers octets
  if (!buffer.subarray(0, Math.min(512, buffer.length)).includes(0x00)) {
    return { kind: "text", mime: "text/plain" };
  }
  return null;
}

/**
 * Sauvegarde un fichier sous STORAGE_DIR (hors webroot), nom aléatoire,
 * répertoire par catégorie. Retourne le chemin RELATIF stocké en BDD.
 */
export async function saveFile(
  buffer: Buffer,
  category: "proofs" | "audio" | "documents" | "stimuli" | "tts",
  extension: string
): Promise<string> {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const relative = path.posix.join(category, `${randomUUID()}.${safeExt}`);
  const absolute = path.join(env.STORAGE_DIR, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);
  return relative;
}

/** Lecture sécurisée : refuse toute traversée hors de STORAGE_DIR. */
export async function readStoredFile(relativePath: string): Promise<{ buffer: Buffer; size: number }> {
  const base = path.resolve(env.STORAGE_DIR);
  const absolute = path.resolve(base, relativePath);
  if (!absolute.startsWith(base + path.sep)) {
    throw new Error("PATH_TRAVERSAL");
  }
  const s = await stat(absolute);
  const buffer = await readFile(absolute);
  return { buffer, size: s.size };
}

export const MAX_UPLOAD_BYTES: Record<AllowedKind, number> = {
  image: 10 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  text: 10 * 1024 * 1024,
  docx: 20 * 1024 * 1024,
};

/** Limite spécifique aux documents de la bibliothèque RAG (manuels volumineux). */
export const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;
