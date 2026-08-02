import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { mailTemplates, sendMail } from "@/lib/mail";
import { syncKebraneAccessInBackground } from "@/lib/kebrane";

export const ALLOWED_GRANT_DAYS = [7, 30, 90, 365] as const;
export type GrantDays = (typeof ALLOWED_GRANT_DAYS)[number];

/**
 * Prolonge l'accès : à partir d'accessUntil si encore dans le futur,
 * sinon à partir de maintenant. Pure et testable via `now` injectable.
 */
export function computeNewAccessUntil(
  current: Date | null,
  days: number,
  now: Date = new Date()
): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + days * 86_400_000);
}

export async function activateUser(params: {
  userId: string;
  days: GrantDays | number;
  adminId: string;
  reason: string; // proof:<id> | promo:<code> | manual
}): Promise<Date> {
  const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });
  const newUntil = computeNewAccessUntil(user.accessUntil, params.days);
  await db.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE", accessUntil: newUntil },
  });
  // Miroir dans Core : le hub Kebrane affiche « Actif » pour GermanPass (KB-08).
  syncKebraneAccessInBackground({ ...user, status: "ACTIVE", accessUntil: newUntil });
  await audit({
    actorId: params.adminId,
    action: "user.activate",
    targetType: "User",
    targetId: user.id,
    metadata: { days: params.days, reason: params.reason, accessUntil: newUntil.toISOString() },
  });
  const tpl = mailTemplates.accountActivated(user.name, newUntil);
  await sendMail(user.email, tpl.subject, tpl.html).catch(() => undefined);
  return newUntil;
}

/**
 * Job cron : envoie un e-mail de rappel aux comptes qui expirent dans ≤ 3 jours.
 * Utilise Redis pour éviter d'envoyer plusieurs fois le même rappel (clé TTL 24 h).
 * Retourne le nombre de rappels envoyés.
 */
export async function sendExpiringReminders(now: Date = new Date()): Promise<number> {
  const { redis } = await import("@/lib/redis");
  const in3Days = new Date(now.getTime() + 3 * 86_400_000);

  const expiring = await db.user.findMany({
    where: {
      status: "ACTIVE",
      role: "STUDENT",
      accessUntil: { gt: now, lte: in3Days },
    },
    select: { id: true, name: true, email: true, accessUntil: true },
  });

  let sent = 0;
  for (const u of expiring) {
    const dedupeKey = `remind:expiring:${u.id}`;
    const already = await redis.exists(dedupeKey);
    if (already) continue;
    const tpl = mailTemplates.accessExpiringSoon(u.name, u.accessUntil!);
    await sendMail(u.email, tpl.subject, tpl.html).catch(() => undefined);
    // Marque comme envoyé pour 25 h (légèrement > 24 h pour absorber les décalages)
    await redis.set(dedupeKey, "1", "EX", 90_000);
    sent += 1;
  }
  return sent;
}

/** Job cron : expire les comptes dont accessUntil est dépassé. Retourne le nb expiré. */
export async function expireOverdueAccounts(now: Date = new Date()): Promise<number> {
  const overdue = await db.user.findMany({
    where: { status: "ACTIVE", role: "STUDENT", accessUntil: { lt: now } },
    select: { id: true, name: true, email: true, clerkUserId: true, plan: true },
  });
  if (overdue.length === 0) return 0;

  // Mise à jour en une seule requête (bien plus performant que N updates séquentiels).
  await db.user.updateMany({
    where: { id: { in: overdue.map((u) => u.id) } },
    data: { status: "EXPIRED" },
  });

  // Miroir dans Core : le hub Kebrane repasse GermanPass à « à souscrire » (KB-08).
  for (const u of overdue) {
    syncKebraneAccessInBackground({ ...u, status: "EXPIRED", accessUntil: null });
  }

  // Audit + emails en parallèle (fire-and-forget pour les emails).
  await Promise.all(
    overdue.map((u) =>
      audit({ actorId: null, action: "user.expire", targetType: "User", targetId: u.id, metadata: { by: "cron" } })
    )
  );
  void Promise.allSettled(
    overdue.map((u) => {
      const tpl = mailTemplates.accessExpired(u.name);
      return sendMail(u.email, tpl.subject, tpl.html);
    })
  );

  return overdue.length;
}
