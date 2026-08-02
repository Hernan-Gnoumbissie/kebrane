import { db } from "@/lib/db";
import { requireStudent, guardErrorResponse } from "@/lib/guards";
import { rateLimit } from "@/lib/rate-limit";
import { detectMime, saveFile, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { enqueue } from "@/lib/queue";
import { audit } from "@/lib/audit";
import { LEVEL_ORDER } from "@/lib/level-progression";

/**
 * Upload d'un enregistrement Sprechen (webm/opus, ogg, mp3).
 * Requiert le consentement audio RGPD (User.audioConsentAt).
 * L'évaluation part en pipeline asynchrone (worker Redis).
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const user = await requireStudent();
    if (!user.audioConsentAt) {
      return Response.json(
        { error: { code: "CONSENT_REQUIRED", message: "Consentement d'enregistrement audio requis (RGPD)" } },
        { status: 403 }
      );
    }
    const rl = await rateLimit(`speaking:${user.id}`, 10, 3600);
    if (!rl.allowed) {
      return Response.json({ error: { code: "RATE_LIMITED", message: "Trop de soumissions" } }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("audio");
    const speakingTaskId = form.get("speakingTaskId")?.toString();
    const attemptId = form.get("attemptId")?.toString() || undefined;
    const durationSec = Number(form.get("durationSec") ?? 0) || null;
    if (!(file instanceof File) || !speakingTaskId) {
      return Response.json({ error: { code: "VALIDATION", message: "audio et speakingTaskId requis" } }, { status: 400 });
    }

    const task = await db.speakingTask.findFirst({ where: { id: speakingTaskId, status: "PUBLISHED" } });
    if (!task) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Tâche introuvable" } }, { status: 404 });
    }

    // Garde : niveau verrouillé
    if (LEVEL_ORDER.indexOf(task.level as never) > LEVEL_ORDER.indexOf(user.currentLevel)) {
      return Response.json(
        { error: { code: "LEVEL_LOCKED", message: "Ce niveau n'est pas encore débloqué." } },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectMime(buffer);
    if (!detected || detected.kind !== "audio") {
      return Response.json(
        { error: { code: "BAD_FILE_TYPE", message: "Format audio accepté : webm/opus, ogg, mp3" } },
        { status: 400 }
      );
    }
    if (buffer.length > MAX_UPLOAD_BYTES.audio) {
      return Response.json({ error: { code: "TOO_LARGE", message: "Audio trop volumineux" } }, { status: 413 });
    }
    // Limite de durée par tâche (tolérance +20 %)
    if (durationSec && durationSec > task.speakTimeSec * 1.2) {
      return Response.json(
        { error: { code: "TOO_LONG", message: `Durée maximale : ${task.speakTimeSec}s` } },
        { status: 400 }
      );
    }

    const ext = detected.mime === "audio/webm" ? "webm" : detected.mime === "audio/ogg" ? "ogg" : "mp3";
    const audioPath = await saveFile(buffer, "audio", ext);

    const submission = await db.speakingSubmission.create({
      data: {
        userId: user.id,
        speakingTaskId: task.id,
        attemptId: attemptId ?? null,
        audioPath,
        durationSec,
        status: "PENDING",
      },
    });
    await enqueue({ type: "speaking_eval", submissionId: submission.id });
    await audit({
      actorId: user.id,
      action: "speaking.submit",
      targetType: "SpeakingSubmission",
      targetId: submission.id,
    });

    return Response.json({ ok: true, submissionId: submission.id, status: "PENDING" }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Historique de mes productions orales. */
export async function GET(): Promise<Response> {
  try {
    const user = await requireStudent();
    const submissions = await db.speakingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        scores: true,
        createdAt: true,
        speakingTask: { select: { title: true, provider: true, level: true } },
      },
    });
    return Response.json({ submissions });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
