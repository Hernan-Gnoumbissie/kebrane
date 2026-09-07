/**
 * Assemblage d'un examen blanc depuis un blueprint (KB-38).
 *
 * Cette logique vivait INLINE dans `POST /api/admin/mock-exams`, donc derrière
 * `requireAdmin`. Elle n'était atteignable qu'avec une session : impossible à
 * appeler depuis un script de seed, impossible à tester sans monter une requête
 * HTTP authentifiée. C'est ce qui a bloqué l'assemblage du lot A1.
 *
 * Elle vit désormais ici. La route s'occupe de l'autorisation et de la forme de
 * la réponse ; l'assemblage, lui, est du domaine — et réutilisable.
 *
 * Le refus est une VALEUR DE RETOUR, pas une exception : une banque
 * insuffisante n'est pas une erreur du programme, c'est un état normal du
 * contenu, et l'appelant doit pouvoir en lister les manques.
 */
import { db } from "@/lib/db";
import { parseStructure } from "@/lib/exam-runner";

export type ResultatAssemblage =
  | { ok: true; mockExamId: string }
  | { ok: false; raison: "BLUEPRINT_INTROUVABLE" }
  | { ok: false; raison: "BANQUE_INSUFFISANTE"; manques: string[] };

type ReferenceItem = {
  questionId?: string;
  writingPromptId?: string;
  speakingTaskId?: string;
  partNumber: number;
};

/**
 * Sélectionne du contenu PUBLIÉ conforme au blueprint et crée l'examen.
 *
 *  - LESEN / HOEREN : un passage par partie, avec ses questions. Hören exige en
 *    plus un `audioPath` — une compréhension orale sans audio n'existe pas.
 *  - SCHREIBEN : la consigne dont le `taskNumber` correspond à la partie.
 *  - SPRECHEN : la tâche dont le `partNumber` correspond.
 *
 * Rien n'est créé si un seul élément manque : mieux vaut pas d'examen qu'un
 * examen amputé d'une section, qu'un candidat découvrirait en pleine épreuve.
 */
export async function assemblerExamenBlanc(params: {
  blueprintId: string;
  titre: string;
}): Promise<ResultatAssemblage> {
  const blueprint = await db.examBlueprint.findUnique({ where: { id: params.blueprintId } });
  if (!blueprint || !blueprint.active) return { ok: false, raison: "BLUEPRINT_INTROUVABLE" };

  const structure = parseStructure(blueprint);
  const manques: string[] = [];
  const sections: { section: string; durationMin: number; position: number; items: ReferenceItem[] }[] =
    [];

  for (let si = 0; si < structure.sections.length; si += 1) {
    const s = structure.sections[si];
    if (!s) continue;
    const items: ReferenceItem[] = [];

    for (const part of s.parts) {
      if (s.section === "LESEN" || s.section === "HOEREN") {
        // On examine TOUS les candidats, pas seulement le plus récent.
        //
        // L'implémentation d'origine faisait un `findFirst` trié par date : elle
        // prenait le dernier passage du bon format et renonçait s'il n'avait pas
        // assez de questions — sans regarder les autres. Un passage plus ancien
        // parfaitement conforme était donc ignoré, et l'examen déclaré
        // impossible à assembler alors que la banque suffisait.
        const candidats = await db.passage.findMany({
          where: {
            section: s.section,
            level: blueprint.level,
            taskFormat: part.taskFormat as never,
            status: "PUBLISHED",
            archived: false,
            providers: { some: { provider: blueprint.provider } },
            ...(s.section === "HOEREN" ? { audioPath: { not: null } } : {}),
          },
          include: {
            questions: {
              where: { status: "PUBLISHED" },
              orderBy: { position: "asc" },
              take: part.itemCount,
            },
          },
          orderBy: { createdAt: "desc" },
        });
        const passage = candidats.find((c) => c.questions.length >= part.itemCount);
        if (!passage) {
          manques.push(
            `${s.section} partie ${part.partNumber} : passage ${part.taskFormat} ${blueprint.level} avec ≥${part.itemCount} questions${s.section === "HOEREN" ? " + audio" : ""}`
          );
          continue;
        }
        for (const q of passage.questions) {
          items.push({ questionId: q.id, partNumber: part.partNumber });
        }
      } else if (s.section === "SCHREIBEN") {
        const consigne = await db.writingPrompt.findFirst({
          where: {
            provider: blueprint.provider,
            level: blueprint.level,
            taskNumber: part.partNumber,
            status: "PUBLISHED",
            archived: false,
          },
        });
        if (!consigne) {
          manques.push(
            `SCHREIBEN tâche ${part.partNumber} : consigne ${blueprint.provider} ${blueprint.level}`
          );
          continue;
        }
        items.push({ writingPromptId: consigne.id, partNumber: part.partNumber });
      } else {
        const tache = await db.speakingTask.findFirst({
          where: {
            provider: blueprint.provider,
            level: blueprint.level,
            partNumber: part.partNumber,
            status: "PUBLISHED",
            archived: false,
          },
        });
        if (!tache) {
          manques.push(
            `SPRECHEN partie ${part.partNumber} : tâche ${blueprint.provider} ${blueprint.level}`
          );
          continue;
        }
        items.push({ speakingTaskId: tache.id, partNumber: part.partNumber });
      }
    }
    sections.push({ section: s.section, durationMin: s.durationMin, position: si, items });
  }

  if (manques.length > 0) return { ok: false, raison: "BANQUE_INSUFFISANTE", manques };

  const examen = await db.mockExam.create({
    data: {
      blueprintId: blueprint.id,
      title: params.titre,
      sections: {
        create: sections.map((s) => ({
          section: s.section as never,
          durationMin: s.durationMin,
          position: s.position,
          items: {
            create: s.items.map((item, i) => ({
              questionId: item.questionId,
              writingPromptId: item.writingPromptId,
              speakingTaskId: item.speakingTaskId,
              partNumber: item.partNumber,
              position: i,
            })),
          },
        })),
      },
    },
  });

  return { ok: true, mockExamId: examen.id };
}
