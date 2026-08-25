/**
 * KB-38 — publication du lot A1 apres relecture.
 *
 * Ne publie QUE ce qui a ete relu. Le contenu reste invisible cote apprenant
 * tant qu'il est en DRAFT ou PENDING_REVIEW ; c'est le passage en PUBLISHED qui
 * le rend visible, d'ou la relecture prealable.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const lecons = await db.lesson.updateMany({
    where: { status: { not: "PUBLISHED" }, course: { level: "A1" } },
    data: { status: "PUBLISHED" },
  });
  console.log(`lecons publiees : ${lecons.count}`);

  const passages = await db.passage.updateMany({
    where: { status: { not: "PUBLISHED" }, level: "A1" },
    data: { status: "PUBLISHED" },
  });
  console.log(`passages publies : ${passages.count}`);

  const sujets = await db.writingPrompt.updateMany({
    where: { status: { not: "PUBLISHED" }, level: "A1" },
    data: { status: "PUBLISHED" },
  });
  console.log(`sujets Schreiben publies : ${sujets.count}`);

  const taches = await db.speakingTask.updateMany({
    where: { status: { not: "PUBLISHED" }, level: "A1" },
    data: { status: "PUBLISHED" },
  });
  console.log(`taches Sprechen publiees : ${taches.count}`);

  await db.$disconnect();
}

void main();
