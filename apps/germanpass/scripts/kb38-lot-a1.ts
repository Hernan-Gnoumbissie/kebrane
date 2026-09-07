/**
 * KB-38 — mini-lot de contenu de démonstration A1.
 *
 * Idempotent : une leçon déjà présente sous le même titre n'est pas régénérée,
 * ce qui permet de relancer après une coupure sans repayer.
 *
 * Chaque chapitre se termine par une leçon marquée `estTestChapitre` (UX-08).
 */
import { PrismaClient } from "@prisma/client";
import { generateLesson, generatePassage } from "../src/lib/generation";

const db = new PrismaClient();

type PlanLecon = { titre: string; lernziel: string; exercices: number; test?: boolean };

const CHAPITRES: { cours: string; kind: "GRAMMAR" | "VOCABULARY" | "REDEMITTEL"; description: string; lecons: PlanLecon[] }[] = [
  {
    cours: "G1 · Alphabet, Laute und Zahlen",
    kind: "GRAMMAR",
    description: "Das deutsche Alphabet, die Aussprache der Umlaute und die Zahlen von 0 bis 100.",
    lecons: [
      { titre: "Das deutsche Alphabet", lernziel: "Die Buchstaben des deutschen Alphabets erkennen, aussprechen und den eigenen Namen buchstabieren.", exercices: 4 },
      { titre: "Die Zahlen von 0 bis 20", lernziel: "Die Zahlen von null bis zwanzig auf Deutsch erkennen, aussprechen und schreiben.", exercices: 4 },
      { titre: "Die Umlaute ä, ö, ü und das ß", lernziel: "Die Umlaute und das Eszett erkennen, korrekt aussprechen und in einfachen Wörtern schreiben.", exercices: 4 },
      { titre: "Kapiteltest: Alphabet und Zahlen", lernziel: "Das Gelernte aus dem Kapitel prüfen: Alphabet, Umlaute und Zahlen bis zwanzig.", exercices: 6, test: true },
    ],
  },
  {
    cours: "V1 · Person & Familie",
    kind: "VOCABULARY",
    description: "Wortschatz rund um die eigene Person und die Familie.",
    lecons: [
      { titre: "Die Familienmitglieder", lernziel: "Die wichtigsten Familienmitglieder benennen: Mutter, Vater, Bruder, Schwester, Eltern, Kinder.", exercices: 4 },
      { titre: "Alter, Herkunft und Wohnort", lernziel: "Nach Alter, Herkunft und Wohnort fragen und darauf antworten.", exercices: 4 },
      { titre: "Kapiteltest: Person und Familie", lernziel: "Den Wortschatz zu Person und Familie prüfen.", exercices: 6, test: true },
    ],
  },
  {
    cours: "R1 · Sich vorstellen",
    kind: "REDEMITTEL",
    description: "Sich und andere vorstellen: Name, Herkunft, Wohnort, Sprachen und Beruf.",
    lecons: [
      { titre: "Begrüßung und Verabschiedung", lernziel: "Sich auf Deutsch begrüßen und verabschieden, formell wie informell.", exercices: 4 },
      { titre: "Sich vorstellen: Name und Herkunft", lernziel: "Den eigenen Namen nennen, buchstabieren und sagen, woher man kommt.", exercices: 4 },
      { titre: "Kapiteltest: Sich vorstellen", lernziel: "Die Redemittel zur Vorstellung prüfen.", exercices: 6, test: true },
    ],
  },
];

const PASSAGES: { section: "LESEN" | "HOEREN"; theme: string; format: "MCQ_SINGLE" | "TRUE_FALSE"; items: number }[] = [
  { section: "LESEN", theme: "Eine kurze Anzeige: Zimmer zu vermieten", format: "MCQ_SINGLE", items: 5 },
  { section: "LESEN", theme: "Eine E-Mail an eine Freundin über das Wochenende", format: "TRUE_FALSE", items: 5 },
  { section: "LESEN", theme: "Ein Schild im Supermarkt: Öffnungszeiten und Angebote", format: "MCQ_SINGLE", items: 5 },
  { section: "HOEREN", theme: "Eine Durchsage am Bahnhof", format: "MCQ_SINGLE", items: 4 },
  { section: "HOEREN", theme: "Ein kurzes Telefongespräch: einen Termin vereinbaren", format: "TRUE_FALSE", items: 4 },
];

async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN", clerkUserId: { not: null } } });
  let generees = 0;
  let ignorees = 0;

  for (const chap of CHAPITRES) {
    let cours = await db.course.findFirst({ where: { title: chap.cours } });
    if (!cours) {
      cours = await db.course.create({
        data: { level: "A1", kind: chap.kind, title: chap.cours, description: chap.description, position: 0 },
      });
      console.log(`+ chapitre cree : ${cours.title}`);
    }

    for (const plan of chap.lecons) {
      const existe = await db.lesson.findFirst({ where: { courseId: cours.id, title: plan.titre } });
      if (existe) {
        console.log(`= deja la : ${plan.titre}`);
        ignorees += 1;
        continue;
      }
      try {
        const id = await generateLesson({
          adminId: admin.id,
          courseId: cours.id,
          title: plan.titre,
          lernziel: plan.lernziel,
          exerciseCount: plan.exercices,
        });
        const g = await db.aiGeneration.findUnique({ where: { id } });
        if (g?.status === "PENDING_REVIEW" && g.resultId) {
          if (plan.test) {
            await db.lesson.update({ where: { id: g.resultId }, data: { estTestChapitre: true } });
          }
          console.log(`+ lecon : ${plan.titre}${plan.test ? " (TEST DE CHAPITRE)" : ""}`);
          generees += 1;
        } else {
          console.log(`! lecon refusee : ${plan.titre} — ${g?.status} ${g?.rejectReason ?? ""}`);
        }
      } catch (e) {
        console.log(`! echec : ${plan.titre} — ${(e as Error).message.split("\n")[0]}`);
      }
    }
  }

  for (const p of PASSAGES) {
    // Idempotence des passages : le modele NOMME lui-meme le passage, et le nom
    // change d'une passe a l'autre. Dedupliquer par titre ne suffit donc pas —
    // c'est ainsi que la premiere relance a produit cinq doublons. On compte
    // plutot les passages deja presents pour cette section.
    const dejaPresents = await db.passage.count({ where: { level: "A1", section: p.section } });
    const voulus = PASSAGES.filter((x) => x.section === p.section).length;
    if (dejaPresents >= voulus) {
      console.log(`= passages  deja au complet (/)`);
      ignorees += 1;
      continue;
    }
    try {
      const id = await generatePassage({
        adminId: admin.id,
        provider: "GOETHE",
        level: "A1",
        section: p.section,
        taskFormat: p.format,
        theme: p.theme,
        itemCount: p.items,
      });
      const g = await db.aiGeneration.findUnique({ where: { id } });
      console.log(`${g?.status === "PENDING_REVIEW" ? "+" : "!"} passage ${p.section} : ${p.theme} — ${g?.status}`);
      if (g?.status === "PENDING_REVIEW") generees += 1;
    } catch (e) {
      console.log(`! passage echec : ${p.theme} — ${(e as Error).message.split("\n")[0]}`);
    }
  }

  const cout = await db.aiUsage.aggregate({ _sum: { costUsd: true } });
  console.log(`\n${generees} generation(s), ${ignorees} ignoree(s). Cout cumule total : ${cout._sum.costUsd} $`);
  await db.$disconnect();
}

void main();
