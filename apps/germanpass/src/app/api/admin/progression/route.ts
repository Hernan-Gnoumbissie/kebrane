import { db } from "@/lib/db";
import { requireAdmin, guardErrorResponse } from "@/lib/guards";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = 25;

    const where = {
      role: "STUDENT" as const,
      status: { not: "DELETED" as const },
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
      ]} : {}),
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          currentLevel: true,
          targetLevel: true,
          targetProvider: true,
          createdAt: true,
          lessonProgress: {
            select: { status: true },
          },
          levelMastery: {
            select: { level: true, masteredAt: true, avgPct: true },
            orderBy: { masteredAt: "asc" },
          },
          attempts: {
            select: { kind: true, status: true, scores: true, startedAt: true },
            orderBy: { startedAt: "desc" },
            take: 5,
          },
        },
      }),
      db.user.count({ where }),
    ]);

    const result = users.map((u) => {
      const completed = u.lessonProgress.filter((p) => p.status === "COMPLETED").length;
      const total     = u.lessonProgress.length;
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

      const lastAttempt = u.attempts[0] ?? null;
      const lastScore = lastAttempt?.scores
        ? (lastAttempt.scores as { pct?: number }).pct
        : null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        currentLevel: u.currentLevel,
        targetLevel: u.targetLevel,
        targetProvider: u.targetProvider,
        lessonsCompleted: completed,
        lessonsTotal: total,
        progressPct: pct,
        levelsMastered: u.levelMastery.map((m) => m.level),
        lastAttemptAt: lastAttempt?.startedAt ?? null,
        lastScorePct: lastScore ?? null,
        memberSince: u.createdAt,
      };
    });

    return Response.json({ users: result, total, page, pageSize });
  } catch (e) {
    return guardErrorResponse(e) ?? Response.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
