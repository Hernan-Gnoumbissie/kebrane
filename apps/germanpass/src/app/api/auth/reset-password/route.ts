import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().length(64), // 32 octets hex = 64 chars
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Une majuscule requise")
    .regex(/[a-z]/, "Une minuscule requise")
    .regex(/[0-9]/, "Un chiffre requis"),
});

/**
 * POST /api/auth/reset-password
 * Valide le token Redis, met à jour le mot de passe, invalide le token.
 */
export async function POST(req: Request): Promise<Response> {
  // Anti-brute-force : 10 essais / 10 min par IP (entropie token 128 bits,
  // mais rate-limit défensif contre d'éventuels tokens courts futurs)
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`reset_pwd:${ip}`, 10, 600);
  if (!rl.allowed) {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "Trop de tentatives, réessayez dans quelques minutes." } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_JSON" } }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "VALIDATION",
          message:
            "Mot de passe invalide (8 caractères min., majuscule, minuscule, chiffre) ou token manquant.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const userId = await redis.get(`pwd_reset_token:${token}`);

  if (!userId) {
    return Response.json(
      { error: { code: "TOKEN_INVALID", message: "Lien invalide ou expiré. Faites une nouvelle demande." } },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user || user.status === "DELETED" || user.status === "SUSPENDED") {
    return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  // Invalider le token (usage unique)
  await redis.del(`pwd_reset_token:${token}`);
  await redis.del(`pwd_reset:${userId}`);

  await audit({ actorId: userId, action: "user.password_reset", targetType: "User", targetId: userId });

  return Response.json({ ok: true, message: "Mot de passe mis à jour. Vous pouvez maintenant vous connecter." });
}
