import bcrypt from "bcryptjs";
import { registerSchema } from "@/lib/validation/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendMail, mailTemplates } from "@/lib/mail";
import { scheduleMarketingSequence } from "@/lib/marketing";

/** Durée du trial offert à l'inscription (24 heures en ms). */
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Message de confirmation renvoyé À L'IDENTIQUE que le compte vienne d'être
 * créé ou qu'il existait déjà. Toute divergence — texte, code HTTP, champ
 * supplémentaire — rouvrirait l'énumération de comptes.
 */
const REGISTER_CONFIRMATION =
  "Vérifiez votre boîte mail : vous venez d'y recevoir la marche à suivre.";

// Le schéma est partagé avec l'écran d'inscription (src/lib/validation/auth.ts)
// : les mêmes règles et les mêmes messages s'appliquent des deux côtés.

export async function POST(req: Request): Promise<Response> {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit(`register:${ip}`, 5, 3600);
  if (!rl.allowed) {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "Trop de tentatives, réessayez plus tard" } },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: { code: "BAD_JSON", message: "JSON invalide" } }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    // `details.fieldErrors` porte les messages du schéma partagé : l'écran les
    // affiche directement sous le champ concerné plutôt que de concaténer un
    // message global illisible.
    const flattened = parsed.error.flatten();
    const message =
      Object.values(flattened.fieldErrors).flat().filter(Boolean).join(" ") ||
      "Certaines informations sont invalides.";
    return Response.json(
      { error: { code: "VALIDATION", message, details: flattened } },
      { status: 400 }
    );
  }
  const { name, email, password, locale, targetProvider, currentLevel, targetLevel } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Réponse identique à celle d'une création réussie : l'écran ne peut pas
    // révéler l'existence du compte. L'information part par e-mail, dans un
    // canal que seul le propriétaire légitime de l'adresse contrôle — il a
    // ainsi un chemin de sortie clair (se connecter / réinitialiser) au lieu
    // d'un refus opaque.
    const tpl = mailTemplates.accountAlreadyExists(existing.name);
    void sendMail(existing.email, tpl.subject, tpl.html).catch((err) =>
      console.error("[register] e-mail « compte déjà existant » non envoyé :", err)
    );

    return Response.json({ ok: true, message: REGISTER_CONFIRMATION }, { status: 201 });
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const trialUntil = new Date(Date.now() + TRIAL_DURATION_MS);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      localePref: locale,
      // Trial 24 h offert immédiatement : accès actif dès l'inscription.
      status: "ACTIVE",
      accessUntil: trialUntil,
      targetProvider: targetProvider ?? null,
      currentLevel: currentLevel,
      targetLevel: targetLevel ?? null,
    },
  });

  await audit({
    actorId: user.id,
    action: "user.register",
    targetType: "User",
    targetId: user.id,
    ipAddress: ip,
    metadata: { trial: true, trialUntil: trialUntil.toISOString() },
  });

  // E-mail de bienvenue avec le trial (en arrière-plan, non bloquant)
  const tpl = mailTemplates.welcomeWithTrial(user.name, trialUntil);
  void sendMail(user.email, tpl.subject, tpl.html).catch((err) =>
    console.error("[register] email de bienvenue non envoyé :", err)
  );

  // Planification de la séquence marketing (email 2 → J+2, email 3 → J+5)
  // Envoyés uniquement si l'utilisateur n'a pas souscrit à une offre payante entre-temps.
  void scheduleMarketingSequence(user.id).catch((err) =>
    console.error("[register] planification marketing échouée :", err)
  );

  // Réponse strictement identique à celle du cas « compte déjà existant ».
  // Le détail (« votre accès de 24 h est actif ») est porté par l'e-mail de
  // bienvenue, pas par cette réponse.
  return Response.json({ ok: true, message: REGISTER_CONFIRMATION }, { status: 201 });
}
