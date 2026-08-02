/**
 * marketing.ts
 * Séquence d'emails marketing automatisés pour les utilisateurs sans abonnement payant.
 *
 * Flow :
 *   J0  (inscription) → email 1 : bienvenue riche (géré dans register route via welcomeWithTrial)
 *   J+2               → email 2 : rappel avantages (marketingReminder)
 *   J+5               → email 3 : offre urgente (marketingUrgent)
 *
 * Stockage : Redis Sorted Set `daf:marketing_schedule`
 *   - score  = timestamp Unix (secondes) de l'envoi prévu
 *   - member = JSON stringifié { userId, step: 2|3 }
 *
 * Déduplication : clé Redis `marketing:sent:{userId}:{step}` (TTL 30 jours)
 *
 * Condition d'envoi : l'utilisateur ne doit pas avoir de PaymentProof APPROVED
 * (= pas d'abonnement payant actif ou passé).
 *
 * Garantie de livraison : AT-MOST-ONCE (au plus une fois).
 *   On retire l'entrée du Sorted Set (`zrem`) AVANT d'appeler `sendMail`. Si le
 *   process crashe entre le `zrem` et l'envoi, l'email est définitivement perdu
 *   (jamais renvoyé). C'est un compromis ASSUMÉ : pour des emails marketing,
 *   perdre occasionnellement un envoi est préférable à risquer des doublons
 *   (spam → désabonnements). Les échecs SMTP *détectés*, eux, sont replanifiés
 *   à +1 h (cf. fin de processMarketingEmails) ; seul un crash brutal du
 *   process provoque une perte silencieuse.
 *   Pour passer à AT-LEAST-ONCE (au moins une fois) : retirer l'entrée APRÈS le
 *   succès de l'envoi, en s'appuyant sur la clé de déduplication
 *   `marketing:sent:*` pour absorber les doublons éventuels.
 */

import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { mailTemplates, sendMail } from "@/lib/mail";

const SCHEDULE_KEY = "daf:marketing_schedule";
const DEDUP_TTL_SEC = 30 * 86_400; // 30 jours

/** Délais de la séquence (en secondes après l'inscription). */
const SEQUENCE_DELAYS: Record<2 | 3, number> = {
  2: 2 * 86_400,  // J+2
  3: 5 * 86_400,  // J+5
};

export type MarketingStep = 2 | 3;

interface ScheduledEntry {
  userId: string;
  step: MarketingStep;
}

/**
 * Planifie les emails marketing post-inscription dans le Sorted Set Redis.
 * À appeler juste après la création d'un compte (credentials ou OAuth).
 */
export async function scheduleMarketingSequence(userId: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  for (const [stepStr, delaySec] of Object.entries(SEQUENCE_DELAYS)) {
    const step = Number(stepStr) as MarketingStep;
    const score = now + delaySec;
    const member = JSON.stringify({ userId, step } satisfies ScheduledEntry);
    // NX = n'ajoute que si le membre n'existe pas déjà
    await redis.zadd(SCHEDULE_KEY, "NX", score, member);
  }
}

/**
 * Vérifie si l'utilisateur a un abonnement payant (PaymentProof APPROVED).
 * Si oui, il ne fait plus partie des cibles marketing.
 */
async function hasPaidSubscription(userId: string): Promise<boolean> {
  const proof = await db.paymentProof.findFirst({
    where: { userId, status: "APPROVED" },
    select: { id: true },
  });
  return proof !== null;
}

/**
 * Job cron : traite tous les emails marketing dont l'heure est arrivée.
 * À appeler toutes les heures depuis le worker.
 * Retourne le nombre d'emails envoyés.
 */
export async function processMarketingEmails(now: Date = new Date()): Promise<number> {
  const nowTs = Math.floor(now.getTime() / 1000);

  // Récupère tous les membres dont le score ≤ now (heure d'envoi atteinte)
  const members = await redis.zrangebyscore(SCHEDULE_KEY, "-inf", nowTs);
  if (members.length === 0) return 0;

  let sent = 0;

  for (const member of members) {
    let entry: ScheduledEntry;
    try {
      entry = JSON.parse(member) as ScheduledEntry;
    } catch {
      // Entrée corrompue → on la supprime
      await redis.zrem(SCHEDULE_KEY, member);
      continue;
    }

    const { userId, step } = entry;

    // Déduplication : évite d'envoyer deux fois le même email
    const dedupKey = `marketing:sent:${userId}:${step}`;
    const alreadySent = await redis.exists(dedupKey);
    if (alreadySent) {
      await redis.zrem(SCHEDULE_KEY, member);
      continue;
    }

    // Supprime de la file AVANT l'envoi → garantie at-most-once : un crash ici
    // perd l'email plutôt que de risquer un doublon (cf. docstring du module).
    await redis.zrem(SCHEDULE_KEY, member);

    // Récupère l'utilisateur
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, status: true },
    });

    if (!user || user.status === "DELETED" || user.status === "SUSPENDED") {
      continue; // compte supprimé ou suspendu, on skip
    }

    // Ne pas envoyer si l'utilisateur a déjà souscrit à une offre payante
    if (await hasPaidSubscription(userId)) {
      await redis.set(dedupKey, "skipped", "EX", DEDUP_TTL_SEC);
      continue;
    }

    // Sélectionne le template
    let subject: string;
    let html: string;
    if (step === 2) {
      ({ subject, html } = mailTemplates.marketingReminder(user.name));
    } else {
      ({ subject, html } = mailTemplates.marketingUrgent(user.name));
    }

    // Envoi
    const ok = await sendMail(user.email, subject, html)
      .then(() => true)
      .catch((err) => {
        console.error(`[marketing] email step=${step} userId=${userId} erreur:`, err);
        return false;
      });

    if (ok) {
      // Marque comme envoyé
      await redis.set(dedupKey, "1", "EX", DEDUP_TTL_SEC);
      sent += 1;
      console.log(`[marketing] email step=${step} envoyé → ${user.email}`);
    } else {
      // Reschedule dans 1 h en cas d'échec SMTP
      const retryScore = nowTs + 3600;
      await redis.zadd(SCHEDULE_KEY, retryScore, member);
    }
  }

  return sent;
}
