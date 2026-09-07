/**
 * KB-38 — audio TTS des passages Hören.
 *
 * Un examen blanc n'assemble une section Hören qu'avec des passages qui ont un
 * `audioPath` : sans audio, la compréhension orale n'existe pas. C'est donc un
 * prérequis a l'assemblage, pas un ornement.
 *
 * On appelle le job directement plutôt que par la file : en local il n'y a pas
 * de worker qui tourne, et la file resterait en attente indéfiniment.
 */
import { PrismaClient } from "@prisma/client";
import { runTtsJob } from "../src/worker/jobs/tts";
import { speedForLevel } from "../src/worker/jobs/tts";

const db = new PrismaClient();

async function main() {
  const passages = await db.passage.findMany({
    where: { section: "HOEREN", level: "A1", audioPath: null },
  });
  console.log(`passages Horen sans audio : ${passages.length}`);

  for (const p of passages) {
    const job = await db.audioJob.create({
      data: {
        targetType: "passage",
        passageId: p.id,
        voice: "auto",
        variety: "DE",
        speed: speedForLevel(p.level),
      },
    });
    try {
      await runTtsJob(job.id);
      const apres = await db.passage.findUnique({ where: { id: p.id } });
      console.log(`${apres?.audioPath ? "+" : "!"} ${p.title} — ${apres?.audioPath ?? "echec"}`);
    } catch (e) {
      console.log(`! ${p.title} — ${(e as Error).message.split("\n")[0]}`);
    }
  }

  const cout = await db.aiUsage.aggregate({ _sum: { costUsd: true } });
  console.log(`cout cumule total : ${cout._sum.costUsd} $`);
  await db.$disconnect();
}

void main();
