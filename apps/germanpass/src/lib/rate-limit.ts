import { redis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * INCR + pose de la TTL au premier incrément, de façon atomique (script Lua
 * exécuté côté serveur Redis). Contrairement à un INCR suivi d'un EXPIRE en
 * deux allers-retours, il n'existe aucune fenêtre pendant laquelle un crash du
 * process laisserait la clé sans TTL (= fuite mémoire, clé jamais expirée).
 * Retourne la valeur du compteur après incrément.
 */
const INCR_WITH_EXPIRY = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

async function incrWithExpiry(key: string, windowSec: number): Promise<number> {
  return Number(await redis.eval(INCR_WITH_EXPIRY, 1, key, windowSec));
}

/**
 * Rate-limit fenêtre fixe par clé (ip+route, userId+action...).
 * Atomique : INCR et pose de TTL dans un seul script Lua (cf. incrWithExpiry).
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const count = await incrWithExpiry(redisKey, windowSec);
  if (count > maxRequests) {
    const ttl = await redis.ttl(redisKey);
    return { allowed: false, remaining: 0, retryAfterSec: Math.max(ttl, 1) };
  }
  return { allowed: true, remaining: maxRequests - count, retryAfterSec: 0 };
}

/** Anti-bruteforce login : compteur d'échecs par email+ip, verrou. */
export async function recordLoginFailure(
  email: string,
  ip: string,
  maxAttempts: number,
  lockSeconds: number
): Promise<{ locked: boolean }> {
  const key = `login:fail:${email.toLowerCase()}:${ip}`;
  const count = await incrWithExpiry(key, lockSeconds);
  return { locked: count >= maxAttempts };
}

export async function isLoginLocked(email: string, ip: string, maxAttempts: number): Promise<boolean> {
  const key = `login:fail:${email.toLowerCase()}:${ip}`;
  const count = await redis.get(key);
  return count !== null && Number(count) >= maxAttempts;
}

export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  await redis.del(`login:fail:${email.toLowerCase()}:${ip}`);
}

/** Extraction IP best-effort derrière Nginx. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
