/**
 * KB-38 — assemblage de l'examen blanc A1.
 *
 * Le mode « auto » puise dans le contenu PUBLIE conforme au blueprint. Il
 * echoue en listant ce qui manque plutot que de produire un examen incomplet —
 * ce qui en fait aussi un bon controle de couverture du lot.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const bp = await db.examBlueprint.findFirst({
    where: { provider: "GOETHE", level: "A1", active: true },
  });
  if (!bp) {
    console.log("aucun blueprint GOETHE A1 actif");
    return;
  }
  console.log(`blueprint : ${bp.id}`);

  // Etat de la banque, pour comprendre un eventuel refus.
  const lesen = await db.passage.count({ where: { section: "LESEN", level: "A1", status: "PUBLISHED" } });
  const horen = await db.passage.count({
    where: { section: "HOEREN", level: "A1", status: "PUBLISHED", audioPath: { not: null } },
  });
  const wp = await db.writingPrompt.count({ where: { level: "A1", status: "PUBLISHED" } });
  const st = await db.speakingTask.count({ where: { level: "A1", status: "PUBLISHED" } });
  console.log(`banque publiee : ${lesen} Lesen, ${horen} Horen avec audio, ${wp} Schreiben, ${st} Sprechen`);

  const prov = await db.passageProvider.count({ where: { provider: "GOETHE" } });
  console.log(`liens passage<->provider GOETHE : ${prov}`);

  await db.$disconnect();
}

void main();
