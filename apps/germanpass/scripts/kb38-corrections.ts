/**
 * KB-38 — corrections de relecture (allemand et pédagogie).
 *
 * Trois défauts trouvés en relisant les dix leçons générées. Ils sont corrigés
 * à la main : ce sont des jugements pédagogiques, pas des reformulations qu'on
 * peut confier à un second passage du modèle.
 *
 * Idempotent : chaque correction vérifie l'état avant d'écrire.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** Consigne de test, SANS rappel de cours — le test ne donne pas ses réponses. */
function consigneTest(titre: string, lernziel: string): string {
  return [
    `## ${titre}`,
    "",
    `**Lernziel**: ${lernziel}`,
    "",
    "Dieser Test schließt das Kapitel ab. Du brauchst **70 %**, um zum nächsten Kapitel zu gehen.",
    "",
    "Lies die Lektionen noch einmal, bevor du beginnst — hier stehen keine Antworten.",
  ].join("\n");
}

async function main() {
  // ── 1. Les tests de chapitre recitaient le cours avant de le tester ──
  // Chacun re-listait l'alphabet, les nombres ou les redemittel, puis posait
  // des questions dont la reponse figurait deux paragraphes plus haut. Un test
  // qui donne ses reponses ne mesure rien.
  const tests = await db.lesson.findMany({ where: { estTestChapitre: true } });
  for (const t of tests) {
    const lernziel =
      t.contentMd.match(/\*\*Lernziel\*\*:\s*(.+)/)?.[1]?.trim() ?? "Das Kapitel prüfen.";
    const attendu = consigneTest(t.title, lernziel);
    if (t.contentMd === attendu) {
      console.log(`= test deja corrige : ${t.title}`);
      continue;
    }
    await db.lesson.update({ where: { id: t.id }, data: { contentMd: attendu } });
    console.log(`+ test allege (plus de rappel de cours) : ${t.title}`);
  }

  // ── 2. Un vrai/faux sans valeur de verite ──
  // « Ich komme aus Spanien » depend de qui repond : la question est cassee.
  const spanien = await db.lessonExercise.findFirst({
    where: { prompt: { contains: "Ich komme aus Spanien" } },
  });
  if (spanien) {
    await db.lessonExercise.update({
      where: { id: spanien.id },
      data: {
        prompt: "Die Frage „Woher kommst du?“ fragt nach dem Land.",
        metadata: { correct: true },
      },
    });
    console.log("+ vrai/faux corrige : « Ich komme aus Spanien » n'avait pas de reponse objective");
  }

  // ── 3. Une question tautologique ──
  // « Wer ist die Mutter? » proposait « Die Mutter » parmi les options.
  const mere = await db.lessonExercise.findFirst({
    where: { prompt: { contains: "Wer ist die Mutter" } },
  });
  if (mere) {
    await db.lessonExercise.update({
      where: { id: mere.id },
      data: {
        prompt: "Wer sind die Kinder der Eltern?",
        metadata: {
          options: [
            { id: "o1", text: "Bruder und Schwester", isCorrect: true },
            { id: "o2", text: "Mutter und Vater", isCorrect: false },
            { id: "o3", text: "Onkel und Tante", isCorrect: false },
          ],
        },
      },
    });
    console.log("+ question tautologique remplacee : « Wer ist die Mutter? » contenait sa reponse");
  }

  // ── 4. Tournure incomplete ──
  // « "Anna" wird A-N-N-A » : il manque le verbe. La lecon R1 dit correctement
  // « Anna wird so buchstabiert: A-N-N-A » — on aligne dessus.
  const alphabet = await db.lesson.findFirst({ where: { title: "Das deutsche Alphabet" } });
  if (alphabet?.contentMd.includes('"Anna" wird A-N-N-A')) {
    await db.lesson.update({
      where: { id: alphabet.id },
      data: {
        contentMd: alphabet.contentMd
          .replace('"Anna" wird A-N-N-A', '"Anna" wird so buchstabiert: A-N-N-A')
          .replace('"Paul" wird P-A-U-L', '"Paul" wird so buchstabiert: P-A-U-L'),
      },
    });
    console.log("+ tournure completee : « Anna wird so buchstabiert: A-N-N-A »");
  }

  await db.$disconnect();
}

void main();
