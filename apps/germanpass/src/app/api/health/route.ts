import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const checks: Record<string, "ok" | "fail"> = { app: "ok", db: "fail", redis: "fail" };
  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    /* db down */
  }
  try {
    if ((await redis.ping()) === "PONG") checks.redis = "ok";
  } catch {
    /* redis down */
  }
  const healthy = checks.db === "ok" && checks.redis === "ok";
  return Response.json(
    { status: healthy ? "healthy" : "degraded", checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
