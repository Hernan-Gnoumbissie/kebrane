/**
 * KB-38 — complète la banque pour que l'examen blanc A1 s'assemble.
 *
 * Trois manques, trois causes distinctes :
 *
 *  1. Les QUESTIONS étaient restées en PENDING_REVIEW. Mon script de
 *     publication couvrait les passages mais pas leurs questions, et
 *     l'assemblage n'accepte que du publié — d'où un « passage introuvable »
 *     alors que le passage existait.
 *  2. Il manquait la tâche SCHREIBEN 1 (le formulaire de Start Deutsch 1) : je
 *     n'avais écrit que la Teil 2.
 *  3. Il manquait les tâches SPRECHEN 2 et 3.
 *
 * Les deux dernières sont rédigées à la main : ce sont des consignes d'examen,
 * pas du contenu à générer. Structure publique de Start Deutsch 1 respectée,
 * aucun sujet officiel reproduit (clause d'indépendance, KB-22).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const q = await db.question.updateMany({
    where: { status: { not: "PUBLISHED" } },
    data: { status: "PUBLISHED" },
  });
  console.log(`questions publiees : ${q.count}`);

  // ── SCHREIBEN Teil 1 : formulaire (GAP_FILL, 5 champs) ──
  const titreForm = "Anmeldung im Sprachkurs";
  if (!(await db.writingPrompt.findFirst({ where: { title: titreForm } }))) {
    await db.writingPrompt.create({
      data: {
        provider: "GOETHE",
        level: "A1",
        taskNumber: 1,
        taskFormat: "GAP_FILL",
        title: titreForm,
        instructions: [
          "Ihre Freundin Sofia möchte einen Deutschkurs besuchen. Sie hilft ihr beim Ausfüllen des Formulars.",
          "",
          "Sofia Mendes kommt aus Portugal und wohnt in der Bergstraße 14 in Köln.",
          "Sie ist 24 Jahre alt und arbeitet als Krankenschwester.",
          "Sie möchte am Abendkurs teilnehmen.",
          "",
          "Ergänzen Sie die fünf fehlenden Angaben im Formular:",
          "(1) Familienname · (2) Herkunftsland · (3) Straße und Hausnummer · (4) Alter · (5) Beruf",
        ].join("\n"),
        minWords: 5,
        maxWords: 40,
        timeLimitMin: 10,
        criteria: [
          { key: "vollstaendigkeit", labelDe: "Vollständigkeit", labelFr: "Exhaustivité", maxPoints: 3,
            description: "Alle fünf Angaben sind ausgefüllt." },
          { key: "korrektheit", labelDe: "Richtigkeit", labelFr: "Exactitude", maxPoints: 2,
            description: "Die Angaben stimmen mit dem Text überein." },
        ],
        status: "PUBLISHED",
        sourceOrigin: "MANUAL",
      },
    });
    console.log(`+ SCHREIBEN Teil 1 : ${titreForm}`);
  }

  // ── SPRECHEN Teil 2 et 3 : jeux de rôle ──
  const taches = [
    {
      partNumber: 2,
      title: "Um Informationen bitten: Einkaufen",
      instructions: [
        "Sie sprechen mit einer Partnerin oder einem Partner über das Thema « Einkaufen ».",
        "",
        "Bilden Sie eine Frage mit dem Wort auf Ihrer Karte und antworten Sie auf die Frage Ihres Gegenübers.",
        "",
        "Ihre Wörter: Supermarkt · Brot · wie viel · wann · bezahlen",
        "",
        "Beispiel: « Wo kaufst du Brot? » — « Ich kaufe Brot im Supermarkt. »",
      ].join("\n"),
      speakTimeSec: 120,
    },
    {
      partNumber: 3,
      title: "Um etwas bitten: im Kurs",
      instructions: [
        "Formulieren Sie eine höfliche Bitte und reagieren Sie auf die Bitte Ihres Gegenübers.",
        "",
        "Ihre Situationen:",
        "– Sie brauchen einen Kugelschreiber.",
        "– Sie möchten das Fenster öffnen.",
        "– Sie verstehen ein Wort nicht.",
        "",
        "Beispiel: « Können Sie mir bitte einen Kugelschreiber geben? » — « Ja, gern. »",
      ].join("\n"),
      speakTimeSec: 120,
    },
  ];

  for (const t of taches) {
    if (await db.speakingTask.findFirst({ where: { title: t.title } })) continue;
    await db.speakingTask.create({
      data: {
        provider: "GOETHE",
        level: "A1",
        partNumber: t.partNumber,
        taskFormat: "DIALOGUE_ROLEPLAY",
        title: t.title,
        instructions: t.instructions,
        prepTimeSec: 0,
        speakTimeSec: t.speakTimeSec,
        status: "PUBLISHED",
        sourceOrigin: "MANUAL",
      },
    });
    console.log(`+ SPRECHEN Teil ${t.partNumber} : ${t.title}`);
  }

  await db.$disconnect();
}

void main();
