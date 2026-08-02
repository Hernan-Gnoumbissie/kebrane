import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendMail, mailTemplates } from "@/lib/mail";
import { env } from "@/lib/env";

const schema = z.object({ email: z.string().email().max(255) });

/** TTL du token de réinitialisation : 1 heure. */
const RESET_TTL_SEC = 3600;

/**
 * POST /api/auth/forgot-password
 * Génère un token Redis TTL 1 h et envoie un lien par e-mail.
 * Réponse identique qu'un compte existe ou non (anti-enumération).
 */
export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req.headers);
  // 3 demandes max / 10 min par IP pour limiter l'abus
  const rl = await rateLimit(`forgot:${ip}`, 3, 600);
  if (!rl.allowed) {
    return Response.json(
      { ok: true, message: "Si cette adresse est enregistrée, un e-mail vous a été envoyé." },
      { status: 200 }
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
    return Response.json({ error: { code: "VALIDATION", message: "E-mail invalide." } }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, status: true, passwordHash: true },
  });

  // Réponse identique pour ne pas révéler l'existence du compte
  const genericResponse = Response.json(
    { ok: true, message: "Si cette adresse est enregistrée, un e-mail vous a été envoyé." },
    { status: 200 }
  );

  if (!user || user.status === "DELETED" || user.status === "SUSPENDED") return genericResponse;
  // Comptes OAuth purs (pas de mot de passe) : on les laisse passer car ils peuvent en définir un
  // via cette même route. Si passwordHash est null, on leur permet de définir un premier mot de passe.

  // Invalider les tokens précédents pour cet utilisateur
  await redis.del(`pwd_reset:${user.id}`);

  // Générer un token opaque cryptographiquement sûr
  const token = randomBytes(32).toString("hex");
  // Stockage : token → userId (clé par token pour lookup rapide)
  await redis.set(`pwd_reset_token:${token}`, user.id, "EX", RESET_TTL_SEC);
  // Stockage inverse : userId → token (pour invalidation future)
  await redis.set(`pwd_reset:${user.id}`, token, "EX", RESET_TTL_SEC);

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  const tpl = mailTemplates.passwordReset(user.name, resetUrl);
  await sendMail(user.email, tpl.subject, tpl.html).catch((err) =>
    console.error("[forgot-password] email non envoyé :", err)
  );

  return genericResponse;
}
