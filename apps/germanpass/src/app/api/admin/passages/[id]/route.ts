import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";
import { audit } from "@/lib/audit";
import { Prisma } from "@prisma/client";

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  position: z.coerce.number().int().min(0).default(0),
});

const questionSchema = z.object({
  id: z.string().optional(),
  taskFormat: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "MATCHING", "GAP_FILL", "ORDERING"]),
  prompt: z.string().min(1),
  explanation: z.string().max(5_000).nullable().optional(),
  explanationFr: z.string().max(5_000).nullable().optional(),
  explanationEn: z.string().max(5_000).nullable().optional(),
  points: z.coerce.number().positive().default(1),
  position: z.coerce.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).nullable().optional(),
  options: z.array(optionSchema).default([]),
});

// Champs optionnels : on n'écrase que ce qui est fourni.
// `providers` et `questions` (s'ils sont présents) remplacent l'ensemble existant.
const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  body: z.string().min(1).optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  section: z.enum(["LESEN", "HOEREN"]).optional(),
  taskFormat: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "MATCHING", "GAP_FILL", "ORDERING"]).optional(),
  variety: z.enum(["DE", "AT", "CH"]).nullable().optional(),
  maxListens: z.coerce.number().int().min(1).max(10).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  providers: z.array(z.enum(["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"])).optional(),
  questions: z.array(questionSchema).optional(),
});

/** Détail complet d'un passage (questions + options + providers) pour l'édition admin. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const passage = await db.passage.findUnique({
      where: { id },
      include: {
        providers: { select: { provider: true } },
        questions: {
          orderBy: { position: "asc" },
          include: { options: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!passage) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    return Response.json({ passage });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/**
 * Édition d'un passage — utilisable avant comme après publication.
 * Remplace atomiquement les providers et les questions (+ options) si fournis.
 * Les questions héritent du statut du passage (PUBLISHED → questions visibles).
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.passage.findUnique({
      where: { id },
      select: { id: true, status: true, section: true, level: true },
    });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: { code: "VALIDATION", details: parsed.error.flatten() } }, { status: 400 });
    }
    const { providers, questions, ...fields } = parsed.data;

    const targetStatus = fields.status ?? existing.status;
    const isPublished = targetStatus === "PUBLISHED";
    const resolvedSection = (fields.section ?? existing.section) as "LESEN" | "HOEREN";
    const resolvedLevel = (fields.level ?? existing.level) as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

    await db.$transaction(async (tx) => {
      await tx.passage.update({
        where: { id },
        data: {
          ...fields,
          // Le booléen `archived` reste cohérent avec le statut.
          ...(fields.status ? { archived: fields.status === "ARCHIVED" } : {}),
        },
      });

      if (providers) {
        await tx.passageProvider.deleteMany({ where: { passageId: id } });
        if (providers.length > 0) {
          await tx.passageProvider.createMany({
            data: providers.map((provider) => ({ passageId: id, provider })),
          });
        }
      }

      if (questions) {
        // Réconciliation NON DESTRUCTIVE : on conserve les IDs des questions et
        // options existantes (les examens blancs et l'historique des tentatives y
        // font référence). On ne supprime que ce qui a réellement disparu.
        const keepQuestionIds = questions.filter((q) => q.id).map((q) => q.id as string);
        await tx.question.deleteMany({
          where: { passageId: id, ...(keepQuestionIds.length ? { id: { notIn: keepQuestionIds } } : {}) },
        });

        for (const q of questions) {
          const { id: qid, options, metadata, ...qFields } = q;
          const metaValue: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
            metadata == null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);
          const data = {
            ...qFields,
            section: resolvedSection,
            level: resolvedLevel,
            status: (isPublished ? "PUBLISHED" : "DRAFT") as "PUBLISHED" | "DRAFT",
            metadata: metaValue,
          };

          if (qid) {
            await tx.question.update({ where: { id: qid }, data });
            const keepOptionIds = options.filter((o) => o.id).map((o) => o.id as string);
            await tx.answerOption.deleteMany({
              where: { questionId: qid, ...(keepOptionIds.length ? { id: { notIn: keepOptionIds } } : {}) },
            });
            for (const o of options) {
              if (o.id) {
                await tx.answerOption.update({
                  where: { id: o.id },
                  data: { text: o.text, isCorrect: o.isCorrect, position: o.position },
                });
              } else {
                await tx.answerOption.create({
                  data: { questionId: qid, text: o.text, isCorrect: o.isCorrect, position: o.position },
                });
              }
            }
          } else {
            await tx.question.create({
              data: {
                ...data,
                passageId: id,
                options: {
                  create: options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, position: o.position })),
                },
              },
            });
          }
        }
      } else if (fields.status) {
        // Pas de remplacement des questions, mais changement de statut :
        // on aligne le statut des questions existantes sur celui du passage.
        await tx.question.updateMany({
          where: { passageId: id },
          data: { status: isPublished ? "PUBLISHED" : "DRAFT" },
        });
      }
    });

    // Publier depuis l'éditeur vaut validation de la génération IA liée.
    if (isPublished) {
      await db.aiGeneration.updateMany({
        where: { targetType: "passage", resultId: id, status: "PENDING_REVIEW" },
        data: { status: "APPROVED" },
      });
    }

    await audit({
      actorId: admin.id,
      action: "passage.update",
      targetType: "Passage",
      targetId: id,
      metadata: {
        fields: Object.keys(fields),
        providersReplaced: Boolean(providers),
        questionsReplaced: Boolean(questions),
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}

/** Suppression d'un passage (cascade : questions, options, providers). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const existing = await db.passage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

    await db.passage.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "passage.delete", targetType: "Passage", targetId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
