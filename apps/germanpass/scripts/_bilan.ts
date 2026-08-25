import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const cours = await db.course.findMany({ where: { level: "A1" }, include: { lessons: { orderBy: { position: "asc" } } } });
  for (const c of cours) {
    console.log(`\n## ${c.title} (${c.kind}) — ${c.lessons.length} lecon(s)`);
    for (const l of c.lessons) {
      const nb = await db.lessonExercise.count({ where: { lessonId: l.id } });
      const premiere = (l.contentMd.split("\n")[0] ?? "").replace(/^#+\s*/, "");
      const ok = premiere.toLowerCase().slice(0, 14) === l.title.toLowerCase().slice(0, 14);
      console.log(`  ${ok ? "OK  " : "ECART"} ${l.estTestChapitre ? "[TEST] " : ""}${l.title} — ${nb} ex. | contenu: ${premiere.slice(0, 45)}`);
    }
  }
  const p = await db.passage.findMany({ include: { questions: true } });
  console.log(`\n## Passages : ${p.length}`);
  for (const x of p) console.log(`  ${x.section} | ${x.title} | ${x.questions.length} question(s) | ${x.status}`);
  console.log(`\nTotaux : ${await db.lesson.count()} lecons, ${await db.lessonExercise.count()} exercices, ${await db.question.count()} questions`);
  await db.$disconnect();
}
void main();
