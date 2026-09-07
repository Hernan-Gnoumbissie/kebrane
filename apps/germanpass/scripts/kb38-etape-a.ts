/**
 * KB-38, étape A — contenu de démonstration A1 SANS aucun appel IA.
 *
 * Tout ce qui suit est rédigé à la main : ce sont des consignes d'examen, pas
 * du contenu à générer. L'allemand est volontairement au niveau A1 et suit la
 * structure publique de Start Deutsch 1 (Goethe) — structure seulement, aucun
 * sujet officiel n'est reproduit (clause d'indépendance, KB-22).
 *
 * Idempotent : rejouable sans créer de doublon.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const COURS = [
  {
    level: "A1" as const,
    kind: "GRAMMAR" as const,
    title: "G1 · Alphabet, Laute und Zahlen",
    description:
      "Das deutsche Alphabet, die Aussprache der Umlaute und die Zahlen von 0 bis 100.",
    position: 1,
  },
  {
    level: "A1" as const,
    kind: "REDEMITTEL" as const,
    title: "R1 · Sich vorstellen",
    description: "Sich und andere vorstellen: Name, Herkunft, Wohnort, Sprachen und Beruf.",
    position: 2,
  },
];

async function main() {
  for (const c of COURS) {
    const existant = await db.course.findFirst({ where: { title: c.title } });
    if (existant) {
      console.log(`= cours deja present : ${c.title}`);
      continue;
    }
    const cree = await db.course.create({ data: c });
    console.log(`+ cours cree : ${cree.title} (${cree.id})`);
  }

  // --- Sujet Schreiben (Start Deutsch 1, Teil 2 : kurze Nachricht) ---
  const titreSchreiben = "Einladung zum Geburtstag";
  if (!(await db.writingPrompt.findFirst({ where: { title: titreSchreiben } }))) {
    const wp = await db.writingPrompt.create({
      data: {
        provider: "GOETHE",
        level: "A1",
        taskNumber: 2,
        taskFormat: "LETTER_INFORMAL",
        title: titreSchreiben,
        instructions: [
          "Ihre Freundin Anna hat bald Geburtstag. Sie möchten sie zu einem Treffen einladen.",
          "Schreiben Sie eine kurze Nachricht (circa 30 Wörter).",
          "",
          "Schreiben Sie etwas zu allen drei Punkten:",
          "– Warum schreiben Sie?",
          "– Wann und wo treffen Sie sich?",
          "– Was soll Anna mitbringen?",
          "",
          "Vergessen Sie die Anrede und den Gruß nicht.",
        ].join("\n"),
        minWords: 25,
        maxWords: 60,
        timeLimitMin: 20,
        criteria: [
          { key: "inhalt", labelDe: "Inhalt", labelFr: "Contenu", maxPoints: 5,
            description: "Alle drei Punkte werden behandelt." },
          { key: "kommunikation", labelDe: "Kommunikative Gestaltung", labelFr: "Forme communicative",
            maxPoints: 5, description: "Anrede, Gruß und passende Textsorte." },
          { key: "korrektheit", labelDe: "Formale Richtigkeit", labelFr: "Correction formelle",
            maxPoints: 5, description: "Wortschatz, Satzbau und Rechtschreibung auf A1-Niveau." },
        ],
        status: "DRAFT",
        sourceOrigin: "MANUAL",
      },
    });
    console.log(`+ sujet Schreiben cree : ${wp.title} (${wp.id})`);
  } else {
    console.log(`= sujet Schreiben deja present : ${titreSchreiben}`);
  }

  // --- Tâche Sprechen (Start Deutsch 1, Teil 1 : sich vorstellen) ---
  const titreSprechen = "Sich vorstellen";
  if (!(await db.speakingTask.findFirst({ where: { title: titreSprechen } }))) {
    const st = await db.speakingTask.create({
      data: {
        provider: "GOETHE",
        level: "A1",
        partNumber: 1,
        taskFormat: "PRESENTATION",
        title: titreSprechen,
        instructions: [
          "Stellen Sie sich bitte vor. Sprechen Sie über die folgenden Punkte:",
          "",
          "Name · Alter · Land · Wohnort · Sprachen · Beruf · Hobby",
          "",
          "Buchstabieren Sie danach Ihren Familiennamen.",
          "Nennen Sie zum Schluss Ihre Telefonnummer.",
        ].join("\n"),
        prepTimeSec: 0,
        speakTimeSec: 90,
        status: "DRAFT",
        sourceOrigin: "MANUAL",
      },
    });
    console.log(`+ tache Sprechen creee : ${st.title} (${st.id})`);
  } else {
    console.log(`= tache Sprechen deja presente : ${titreSprechen}`);
  }

  await db.$disconnect();
}

void main();
