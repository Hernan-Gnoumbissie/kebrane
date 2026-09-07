/**
 * Exercice de recette : B1 — « Ein Termin beim Arzt », deux voix distinctes.
 *
 * Le dialogue est ECRIT A LA MAIN, pas généré : on veut mesurer le pipeline
 * audio, pas la créativité du modèle. Si l'audio sort faux, l'erreur est dans
 * la synthèse ou l'assemblage, nulle part ailleurs.
 *
 * L'audio, lui, est REEL : vrai appel TTS, vraie synthèse, vrai encodage. Le
 * cahier des charges interdit toute simulation en dehors des tests unitaires,
 * et un faux mp3 ne prouverait rien de ce qu'on cherche à prouver.
 *
 * Le job est exécuté directement : en local aucun worker ne dépile la file.
 *
 *   pnpm exec tsx scripts/hoeren-recette-b1.ts
 */
import { PrismaClient } from "@prisma/client";
import { runTtsJob, speedForLevel } from "../src/worker/jobs/tts";
import { casterPersonnages, voixToutesDistinctes } from "../src/lib/hoeren/voices";
import { transcript, validerDialogue, versPersonnagesDemandes } from "../src/lib/hoeren/dialogue";
import type { DialogueGenere } from "../src/lib/hoeren/dialogue";

const db = new PrismaClient();

const DIALOGUE: DialogueGenere = {
  title: "Ein Termin beim Arzt",
  speakers: [
    { id: "speaker_1", name: "Patient", gender: "male", age_group: "adult", role: "le patient" },
    { id: "speaker_2", name: "Ärztin", gender: "female", age_group: "adult", role: "la médecin" },
  ],
  dialogue: [
    { speaker_id: "speaker_1", text: "Guten Morgen. Ich habe seit gestern starke Kopfschmerzen." },
    { speaker_id: "speaker_2", text: "Guten Morgen. Setzen Sie sich bitte. Haben Sie auch Fieber?" },
    { speaker_id: "speaker_1", text: "Nein, Fieber habe ich nicht. Aber ich schlafe sehr schlecht." },
    { speaker_id: "speaker_2", text: "Und wie lange geht das schon so?" },
    { speaker_id: "speaker_1", text: "Seit ungefähr zwei Wochen, würde ich sagen." },
    { speaker_id: "speaker_2", text: "Arbeiten Sie zurzeit viel am Bildschirm?" },
    { speaker_id: "speaker_1", text: "Ja, ziemlich viel. Manchmal acht oder neun Stunden am Tag." },
    { speaker_id: "speaker_2", text: "Das kann eine Rolle spielen. Wir sollten das genauer untersuchen." },
    { speaker_id: "speaker_1", text: "Wann wäre denn ein Termin möglich?" },
    { speaker_id: "speaker_2", text: "Am Donnerstagvormittag hätte ich um zehn Uhr noch etwas frei." },
    { speaker_id: "speaker_1", text: "Der Donnerstag passt mir gut. Muss ich etwas mitbringen?" },
    { speaker_id: "speaker_2", text: "Bringen Sie bitte Ihre Versichertenkarte und die alten Befunde mit." },
  ],
  questions: [
    {
      prompt: "Wann bekommt der Patient seinen Termin?",
      explanation: "Die Ärztin sagt: „Am Donnerstagvormittag hätte ich um zehn Uhr noch etwas frei.“",
      explanationFr: "La médecin propose le jeudi matin à dix heures.",
      explanationEn: "The doctor offers Thursday morning at ten o'clock.",
      options: [
        { text: "Am Donnerstag um zehn Uhr", isCorrect: true },
        { text: "Am Dienstag um zehn Uhr", isCorrect: false },
        { text: "Am Donnerstag um zwei Uhr", isCorrect: false },
      ],
    },
    {
      prompt: "Welches Symptom nennt der Patient NICHT?",
      explanation: "Er sagt ausdrücklich: „Nein, Fieber habe ich nicht.“",
      explanationFr: "Il dit explicitement qu'il n'a pas de fièvre.",
      explanationEn: "He explicitly says he has no fever.",
      options: [
        { text: "Fieber", isCorrect: true },
        { text: "Kopfschmerzen", isCorrect: false },
        { text: "Schlafprobleme", isCorrect: false },
      ],
    },
    {
      prompt: "Was soll der Patient zum Termin mitbringen?",
      explanation: "Die Ärztin nennt die Versichertenkarte und die alten Befunde.",
      explanationFr: "La carte d'assuré et les anciens résultats d'examen.",
      explanationEn: "The insurance card and the previous medical findings.",
      options: [
        { text: "Versichertenkarte und alte Befunde", isCorrect: true },
        { text: "Nur die Versichertenkarte", isCorrect: false },
        { text: "Ein Rezept vom Hausarzt", isCorrect: false },
      ],
    },
  ],
};

async function main() {
  const problemes = validerDialogue(DIALOGUE, "B1");
  if (problemes.length > 0) {
    console.error("Dialogue invalide :", problemes);
    process.exit(1);
  }

  const castes = casterPersonnages(versPersonnagesDemandes(DIALOGUE));
  if (!voixToutesDistinctes(castes)) {
    console.error("Casting invalide : voix en doublon");
    process.exit(1);
  }
  console.log("Distribution :");
  for (const c of castes) console.log(`  ${c.nom.padEnd(10)} → ${c.voix} (${c.profilId})`);

  const existant = await db.passage.findFirst({
    where: { section: "HOEREN", level: "B1", title: DIALOGUE.title },
  });

  const passage = existant
    ? await db.passage.update({
        where: { id: existant.id },
        data: {
          body: transcript(DIALOGUE),
          situation: "ARZTBESUCH",
          speakers: castes as never,
          dialogue: DIALOGUE.dialogue as never,
          audioStatus: "PENDING",
          audioError: null,
        },
      })
    : await db.passage.create({
        data: {
          section: "HOEREN",
          level: "B1",
          taskFormat: "MCQ_SINGLE",
          title: DIALOGUE.title,
          body: transcript(DIALOGUE),
          situation: "ARZTBESUCH",
          speakers: castes as never,
          dialogue: DIALOGUE.dialogue as never,
          audioStatus: "PENDING",
          maxListens: 2,
          sourceOrigin: "MANUAL",
          status: "DRAFT",
          providers: { create: [{ provider: "GOETHE" }] },
          questions: {
            create: DIALOGUE.questions.map((q, i) => ({
              section: "HOEREN" as const,
              level: "B1" as const,
              taskFormat: "MCQ_SINGLE" as const,
              prompt: q.prompt,
              explanation: q.explanation,
              explanationFr: q.explanationFr,
              explanationEn: q.explanationEn,
              sourceOrigin: "MANUAL" as const,
              status: "DRAFT" as const,
              position: i,
              options: {
                create: (q.options ?? []).map((o, j) => ({
                  text: o.text,
                  isCorrect: o.isCorrect,
                  position: j,
                })),
              },
            })),
          },
        },
      });

  console.log(`Passage ${existant ? "mis a jour" : "cree"} : ${passage.id}`);

  const job = await db.audioJob.create({
    data: {
      targetType: "passage",
      passageId: passage.id,
      voice: "auto",
      variety: "DE",
      speed: speedForLevel("B1"),
    },
  });

  console.log(`Synthese de ${DIALOGUE.dialogue.length} repliques...`);
  const debut = Date.now();
  await runTtsJob(job.id);
  console.log(`Termine en ${Math.round((Date.now() - debut) / 1000)} s`);

  const apres = await db.passage.findUniqueOrThrow({ where: { id: passage.id } });
  const segments = (apres.audioSegments ?? []) as { speakerId: string; voix: string }[];

  console.log(`\nStatut       : ${apres.audioStatus}`);
  console.log(`Fichier      : ${apres.audioPath}`);
  console.log(`Duree        : ${apres.audioDurationSec?.toFixed(1)} s`);
  console.log(`Segments     : ${segments.length}`);
  console.log("\nAlternance des voix :");
  segments.forEach((s, i) => console.log(`  replique ${String(i + 1).padStart(2)} → ${s.voix}`));

  const voixDistinctes = new Set(segments.map((s) => s.voix));
  if (voixDistinctes.size < 2) {
    console.error(`\nECHEC : une seule voix (${[...voixDistinctes].join(", ")}) — c'est le defaut a corriger.`);
    process.exit(1);
  }
  console.log(`\nOK : ${voixDistinctes.size} voix distinctes → ${[...voixDistinctes].join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
