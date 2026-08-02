import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { detectMime, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { transcribeImage, AiBudgetExceededError } from "@/lib/ai";

/**
 * OCR d'une copie manuscrite (Schreiben sur papier) → texte éditable.
 * L'image n'est PAS stockée (transcription en mémoire). L'élève vérifie et
 * corrige la transcription avant de la soumettre via le flux Schreiben normal.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    const rl = await rateLimit(`transcribe:${user.id}`, 20, 3600);
    if (!rl.allowed) {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Trop de transcriptions, réessayez plus tard" } },
        { status: 429 }
      );
    }

    const form = await req.formData();
    const files = form.getAll("images").filter((f): f is File => f instanceof File);
    if (files.length === 0 || files.length > 3) {
      return Response.json(
        { error: { code: "VALIDATION", message: "Importez 1 à 3 images (JPG/PNG/WEBP)." } },
        { status: 400 }
      );
    }

    const images: { base64: string; mime: string }[] = [];
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const detected = detectMime(buf);
      if (!detected || detected.kind !== "image") {
        return Response.json(
          { error: { code: "INVALID_FILE", message: "Seules les images JPG, PNG ou WEBP sont acceptées." } },
          { status: 400 }
        );
      }
      if (buf.length > MAX_UPLOAD_BYTES.image) {
        return Response.json(
          { error: { code: "TOO_LARGE", message: "Image trop volumineuse (max 10 Mo)." } },
          { status: 400 }
        );
      }
      images.push({ base64: buf.toString("base64"), mime: detected.mime });
    }

    const text = await transcribeImage({ images, userId: user.id });
    return Response.json({ text });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    if (e instanceof AiBudgetExceededError) {
      return Response.json(
        { error: { code: "AI_BUDGET", message: "Plafond IA mensuel atteint." } },
        { status: 502 }
      );
    }
    return Response.json(
      { error: { code: "TRANSCRIBE_FAILED", message: "Transcription impossible — réessayez avec une photo plus nette." } },
      { status: 502 }
    );
  }
}
