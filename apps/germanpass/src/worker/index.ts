/**
 * Worker asynchrone GermanPass.
 * - Queue Redis (BRPOP) : jobs ingestion RAG, TTS, pipeline Sprechen (phases 3 & 5)
 * - Cron interne : expiration des comptes (toutes les heures), rappels J-3
 */
import "dotenv/config";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const db = new PrismaClient();

export const QUEUE_KEY = "daf:jobs";

type Job =
  | { type: "expire_accounts" }
  | { type: "remind_expiring" }
  | { type: "ingest_document"; documentId: string }
  | { type: "tts"; audioJobId: string }
  | { type: "speaking_eval"; submissionId: string }
  | { type: "process_marketing_emails" };

async function handleJob(job: Job): Promise<void> {
  switch (job.type) {
    case "expire_accounts": {
      const { expireOverdueAccounts } = await import("@/lib/account");
      const n = await expireOverdueAccounts();
      if (n > 0) console.log(`[cron] ${n} compte(s) expiré(s)`);
      break;
    }
    case "remind_expiring": {
      const { sendExpiringReminders } = await import("@/lib/account");
      const n = await sendExpiringReminders();
      if (n > 0) console.log(`[cron] ${n} rappel(s) J-3 envoyé(s)`);
      break;
    }
    case "ingest_document": {
      const { ingestDocument } = await import("@/worker/jobs/ingest");
      await ingestDocument(job.documentId);
      break;
    }
    case "tts": {
      const { runTtsJob } = await import("@/worker/jobs/tts");
      await runTtsJob(job.audioJobId);
      break;
    }
    case "speaking_eval": {
      const { evaluateSpeaking } = await import("@/worker/jobs/speaking");
      await evaluateSpeaking(job.submissionId);
      break;
    }
    case "process_marketing_emails": {
      const { processMarketingEmails } = await import("@/lib/marketing");
      const n = await processMarketingEmails();
      if (n > 0) console.log(`[marketing] ${n} email(s) de marketing envoyé(s)`);
      break;
    }
  }
}

async function cronLoop(): Promise<void> {
  // Expiration des comptes : toutes les heures
  setInterval(() => {
    void redis.lpush(QUEUE_KEY, JSON.stringify({ type: "expire_accounts" } satisfies Job));
  }, 3600_000);
  // Rappels J-3 : une fois par jour (toutes les 24 h)
  setInterval(() => {
    void redis.lpush(QUEUE_KEY, JSON.stringify({ type: "remind_expiring" } satisfies Job));
  }, 86_400_000);
  // Emails marketing : toutes les heures (traitement du Sorted Set planifié)
  setInterval(() => {
    void redis.lpush(QUEUE_KEY, JSON.stringify({ type: "process_marketing_emails" } satisfies Job));
  }, 3600_000);
  // Premiers passages au démarrage
  await redis.lpush(QUEUE_KEY, JSON.stringify({ type: "expire_accounts" } satisfies Job));
  await redis.lpush(QUEUE_KEY, JSON.stringify({ type: "remind_expiring" } satisfies Job));
  await redis.lpush(QUEUE_KEY, JSON.stringify({ type: "process_marketing_emails" } satisfies Job));
}

async function main(): Promise<void> {
  console.log("[worker] démarré");
  await cronLoop();
  const blocking = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  for (;;) {
    try {
      const res = await blocking.brpop(QUEUE_KEY, 30);
      if (!res) continue;
      const job = JSON.parse(res[1]) as Job;
      console.log(`[worker] job: ${job.type}`);
      await handleJob(job);
    } catch (e) {
      console.error("[worker] erreur:", e);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
