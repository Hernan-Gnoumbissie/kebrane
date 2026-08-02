import { db } from "@/lib/db";
import { requireAuthenticated, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";

/**
 * Export RGPD : toutes les données personnelles de l'utilisateur au format JSON
 * téléchargeable (droit à la portabilité, cf. /legal).
 */
export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthenticated();

    const [proofs, promoRedemptions, attempts, writingSubmissions, speakingSubmissions, lessonProgress, flashcardReviews] =
      await Promise.all([
        db.paymentProof.findMany({
          where: { userId: user.id },
          select: { id: true, status: true, daysGranted: true, note: true, rejectReason: true, createdAt: true },
        }),
        db.promoRedemption.findMany({
          where: { userId: user.id },
          select: { id: true, promoCodeId: true, redeemedAt: true },
        }),
        db.attempt.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            kind: true,
            section: true,
            status: true,
            scores: true,
            startedAt: true,
            submittedAt: true,
          },
        }),
        db.writingSubmission.findMany({
          where: { userId: user.id },
          select: { id: true, text: true, wordCount: true, status: true, scores: true, feedback: true, createdAt: true },
        }),
        db.speakingSubmission.findMany({
          where: { userId: user.id },
          select: { id: true, durationSec: true, transcript: true, status: true, scores: true, feedback: true, createdAt: true },
        }),
        db.lessonProgress.findMany({
          where: { userId: user.id },
          select: { lessonId: true, status: true, bestScore: true, completedAt: true, updatedAt: true },
        }),
        db.flashcardReview.findMany({ where: { userId: user.id } }),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        accessUntil: user.accessUntil,
        audioConsentAt: user.audioConsentAt,
        localePref: user.localePref,
        createdAt: user.createdAt,
      },
      paymentProofs: proofs,
      promoRedemptions,
      attempts,
      writingSubmissions,
      speakingSubmissions,
      lessonProgress,
      flashcardReviews,
    };

    await audit({
      actorId: user.id,
      action: "account.export",
      targetType: "User",
      targetId: user.id,
    });

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="daf-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL", message: "Erreur interne" } }, { status: 500 });
  }
}
