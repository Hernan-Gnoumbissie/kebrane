import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { assemblerExamenBlanc } from "@/lib/mock-exam-assembly";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  blueprintId: z.string().min(1),
  title: z.string().min(3).max(200),
  /** auto : sélection automatique de contenu publié conforme au blueprint */
  mode: z.enum(["auto"]).default("auto"),
});

/**
 * Crée un examen blanc à partir d'un blueprint.
 *
 * L'assemblage lui-même vit dans `lib/mock-exam-assembly` : il était écrit
 * INLINE ici, donc inatteignable sans session admin — ni un script de seed ni
 * un test ne pouvaient l'appeler, et c'est ce qui a bloqué l'assemblage du lot
 * A1 (KB-38). La route ne garde que ce qui la concerne : autorisation,
 * validation d'entrée, forme de la réponse et journal d'audit.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json(
        { error: { code: "VALIDATION", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const resultat = await assemblerExamenBlanc({
      blueprintId: parsed.data.blueprintId,
      titre: parsed.data.title,
    });

    if (!resultat.ok) {
      if (resultat.raison === "BLUEPRINT_INTROUVABLE") {
        return Response.json(
          { error: { code: "NOT_FOUND", message: "Blueprint introuvable" } },
          { status: 404 }
        );
      }
      return Response.json(
        {
          error: {
            code: "INSUFFICIENT_CONTENT",
            message: "Banque de contenu insuffisante",
            missing: resultat.manques,
          },
        },
        { status: 422 }
      );
    }

    await audit({
      actorId: admin.id,
      action: "mock_exam.create",
      targetType: "MockExam",
      targetId: resultat.mockExamId,
    });
    const mockExam = await db.mockExam.findUnique({ where: { id: resultat.mockExamId } });
    return Response.json({ mockExam }, { status: 201 });
  } catch (e) {
    const guarded = guardErrorResponse(e);
    if (guarded) return guarded;
    console.error(e);
    return Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const exams = await db.mockExam.findMany({
      orderBy: { createdAt: "desc" },
      include: { blueprint: { select: { provider: true, level: true, title: true } } },
    });
    return Response.json({ exams });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
