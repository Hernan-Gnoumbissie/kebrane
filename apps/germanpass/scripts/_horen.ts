import { PrismaClient } from "@prisma/client";
import { generatePassage } from "../src/lib/generation";
import { runTtsJob, speedForLevel } from "../src/worker/jobs/tts";
const db = new PrismaClient();

const MANQUANTS = [
  { theme: "Eine Nachricht auf dem Anrufbeantworter: Verabredung im Café", items: 6 },
  { theme: "Eine Wettervorhersage im Radio", items: 5 },
];

async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN", clerkUserId: { not: null } } });
  for (const m of MANQUANTS) {
    const id = await generatePassage({
      adminId: admin.id, provider: "GOETHE", level: "A1",
      section: "HOEREN", taskFormat: "MCQ_SINGLE", theme: m.theme, itemCount: m.items,
    });
    const g = await db.aiGeneration.findUnique({ where: { id } });
    if (g?.status !== "PENDING_REVIEW" || !g.resultId) { console.log(`! ${m.theme} — ${g?.status}`); continue; }
    await db.passage.update({ where: { id: g.resultId }, data: { status: "PUBLISHED" } });
    const p = await db.passage.findUniqueOrThrow({ where: { id: g.resultId } });
    const job = await db.audioJob.create({
      data: { targetType: "passage", passageId: p.id, voice: "auto", variety: "DE", speed: speedForLevel(p.level) },
    });
    await runTtsJob(job.id);
    const apres = await db.passage.findUnique({ where: { id: p.id } });
    console.log(`+ ${p.title} — ${m.items} items — audio ${apres?.audioPath ? "OK" : "ECHEC"}`);
  }
  const h = await db.passage.count({ where: { section: "HOEREN", level: "A1", status: "PUBLISHED", audioPath: { not: null } } });
  const c = await db.aiUsage.aggregate({ _sum: { costUsd: true } });
  console.log(`Horen publies avec audio : ${h} | cout cumule : ${c._sum.costUsd} $`);
  await db.$disconnect();
}
void main();
