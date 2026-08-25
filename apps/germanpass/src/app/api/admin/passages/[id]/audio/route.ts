/**
 * Génération et régénération de l'audio d'un passage Hören (admin).
 *
 * POST   → met l'audio en file (première génération ou régénération).
 * DELETE → invalide l'audio existant sans toucher au dialogue.
 *
 * L'audio est un actif permanent : généré une fois, écouté sans limite. Rien
 * ici n'est appelé depuis l'espace apprenant, et aucune synthèse ne part à la
 * lecture d'un exercice.
 */
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { enqueue } from "@/lib/queue";
import { audit } from "@/lib/audit";
import { casterPersonnages, type PersonnageCaste } from "@/lib/hoeren/voices";

const schema = z.object({
  /** Rejoue le casting en écartant les voix actuelles — pour changer de timbre
   *  sans retoucher une ligne du dialogue. */
  recasterVoix: z.boolean().default(false),
  speed: z.coerce.number().min(0.25).max(4).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const passage = await db.passage.findUnique({ where: { id } });
    if (!passage) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    if (passage.section !== "HOEREN") {
      return Response.json(
        { error: { code: "PAS_UN_HOEREN", message: "Seuls les passages Hören portent un audio." } },
        { status: 400 }
      );
    }

    // Une génération déjà en cours : on refuse plutôt que d'empiler deux jobs
    // sur le même passage, qui se termineraient dans un ordre imprévisible et
    // dont le dernier écraserait le premier.
    if (passage.audioStatus === "GENERATING") {
      return Response.json(
        { error: { code: "DEJA_EN_COURS", message: "Une génération est déjà en cours." } },
        { status: 409 }
      );
    }

    if (parsed.data.recasterVoix) {
      const castes = passage.speakers as PersonnageCaste[] | null;
      if (!Array.isArray(castes) || castes.length === 0) {
        return Response.json(
          { error: { code: "PAS_DE_CASTING", message: "Ce passage n'a pas de personnages." } },
          { status: 400 }
        );
      }
      // Le dialogue est CONSERVÉ : seules les voix changent. C'est le cas
      // d'usage courant — le texte convient, le timbre non.
      const nouveau = casterPersonnages(castes, { exclues: castes.map((c) => c.voix) });
      await db.passage.update({ where: { id }, data: { speakers: nouveau as never } });
    }

    const { speedForLevel } = await import("@/worker/jobs/tts");
    const job = await db.audioJob.create({
      data: {
        targetType: "passage",
        passageId: passage.id,
        voice: "auto",
        variety: passage.variety ?? "DE",
        speed: parsed.data.speed ?? speedForLevel(passage.level),
      },
    });

    // L'ancien fichier reste servi tant que le nouveau n'est pas prêt : une
    // régénération ne doit pas rendre un exercice publié momentanément muet.
    await db.passage.update({
      where: { id },
      data: { audioStatus: "PENDING", audioError: null },
    });

    await enqueue({ type: "tts", audioJobId: job.id });
    await audit({
      actorId: admin.id,
      action: parsed.data.recasterVoix ? "hoeren.audio.recast" : "hoeren.audio.generate",
      targetType: "Passage",
      targetId: passage.id,
    });

    return Response.json({ ok: true, jobId: job.id }, { status: 201 });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Invalide l'audio : le dialogue et les questions sont conservés. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const passage = await db.passage.findUnique({ where: { id } });
    if (!passage) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    await db.passage.update({
      where: { id },
      data: {
        audioPath: null,
        audioStatus: "NONE",
        audioDurationSec: null,
        audioSegments: undefined,
        audioGeneratedAt: null,
        audioError: null,
      },
    });
    await audit({
      actorId: admin.id,
      action: "hoeren.audio.invalidate",
      targetType: "Passage",
      targetId: id,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
