import { redis } from "@/lib/redis";

export const QUEUE_KEY = "daf:jobs";

/** Types de jobs acceptés par le worker — doit rester en sync avec worker/index.ts */
export type QueueJob =
  | { type: "expire_accounts" }
  | { type: "remind_expiring" }
  | { type: "ingest_document"; documentId: string }
  | { type: "tts"; audioJobId: string }
  | { type: "speaking_eval"; submissionId: string }
  | { type: "process_marketing_emails" };

export async function enqueue(job: QueueJob): Promise<void> {
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
}
