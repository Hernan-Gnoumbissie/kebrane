import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const filtre = process.argv[2] ?? "";
  const cours = await db.course.findMany({
    where: { level: "A1", title: { contains: filtre } },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  for (const c of cours) {
    for (const l of c.lessons) {
      console.log(`\n@@@@@ ${l.title}${l.estTestChapitre ? " [TEST]" : ""}`);
      console.log(l.contentMd);
      const ex = await db.lessonExercise.findMany({ where: { lessonId: l.id }, orderBy: { position: "asc" } });
      for (const e of ex) {
        const m = e.metadata as { options?: { text: string; isCorrect: boolean }[]; correct?: boolean };
        console.log(`  [${e.taskFormat}] ${e.prompt}`);
        m.options?.forEach((o) => console.log(`     ${o.isCorrect ? "V" : " "} ${o.text}`));
        if (m.correct !== undefined) console.log(`     reponse = ${m.correct}`);
      }
    }
  }
  await db.$disconnect();
}
void main();
