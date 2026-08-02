import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      usersByStatus,
      newUsersLast30d,
      newUsersLast7d,
      totalAttempts,
      attemptsLast30d,
      practiceAttempts,
      mockAttempts,
      writingSubmissions,
      speakingSubmissions,
      aiUsageRaw,
      lessonProgressCompleted,
      levelMasteryCount,
    ] = await Promise.all([
      // Utilisateurs par statut
      db.user.groupBy({ by: ["status"], _count: { id: true } }),
      // Nouveaux inscrits 30j
      db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Nouveaux inscrits 7j
      db.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      // Tentatives total
      db.attempt.count(),
      // Tentatives 30j
      db.attempt.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      // Practice
      db.attempt.count({ where: { kind: "PRACTICE" } }),
      // Mock exams
      db.attempt.count({ where: { kind: "MOCK" } }),
      // Soumissions écriture
      db.writingSubmission.groupBy({ by: ["status"], _count: { id: true } }),
      // Soumissions oral
      db.speakingSubmission.groupBy({ by: ["status"], _count: { id: true } }),
      // Coût IA par type (30 derniers jours)
      db.aiUsage.groupBy({
        by: ["kind"],
        _sum: { costUsd: true, inputTokens: true, outputTokens: true },
        _count: { id: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // Leçons complétées
      db.lessonProgress.count({ where: { status: "COMPLETED" } }),
      // Niveaux maîtrisés
      db.levelMastery.count(),
    ]);

    // Coût IA total 30j
    const totalCostLast30d = aiUsageRaw.reduce(
      (sum, r) => sum + Number(r._sum.costUsd ?? 0),
      0
    );

    return Response.json({
      users: {
        byStatus: Object.fromEntries(
          usersByStatus.map((r) => [r.status, r._count.id])
        ),
        newLast30d: newUsersLast30d,
        newLast7d: newUsersLast7d,
      },
      attempts: {
        total: totalAttempts,
        last30d: attemptsLast30d,
        practice: practiceAttempts,
        mock: mockAttempts,
      },
      writing: Object.fromEntries(
        writingSubmissions.map((r) => [r.status, r._count.id])
      ),
      speaking: Object.fromEntries(
        speakingSubmissions.map((r) => [r.status, r._count.id])
      ),
      ai: {
        totalCostLast30dUsd: totalCostLast30d,
        byKind: aiUsageRaw.map((r) => ({
          kind: r.kind,
          count: r._count.id,
          costUsd: Number(r._sum.costUsd ?? 0),
          inputTokens: r._sum.inputTokens ?? 0,
          outputTokens: r._sum.outputTokens ?? 0,
        })),
      },
      learning: {
        lessonsCompleted: lessonProgressCompleted,
        levelsMastered: levelMasteryCount,
      },
    });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
