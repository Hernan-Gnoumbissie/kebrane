/**
 * KB-38 — assemble l'examen blanc A1.
 *
 * Possible seulement depuis que `assemblerExamenBlanc` est sorti de la route
 * admin : la logique était inline derrière `requireAdmin`, donc inatteignable
 * hors d'une requête HTTP authentifiée.
 *
 * Idempotent : n'assemble pas si un examen existe déjà pour ce blueprint.
 */
import { PrismaClient } from "@prisma/client";
import { assemblerExamenBlanc } from "../src/lib/mock-exam-assembly";

const db = new PrismaClient();

async function main() {
  const bp = await db.examBlueprint.findFirst({
    where: { provider: "GOETHE", level: "A1", active: true },
  });
  if (!bp) {
    console.log("aucun blueprint GOETHE A1 actif");
    return;
  }

  const deja = await db.mockExam.findFirst({ where: { blueprintId: bp.id } });
  if (deja) {
    console.log(`= examen deja assemble : ${deja.title}`);
    await db.$disconnect();
    return;
  }

  const r = await assemblerExamenBlanc({
    blueprintId: bp.id,
    titre: "Start Deutsch 1 — Übungsprüfung A1",
  });

  if (r.ok) {
    const e = await db.mockExam.findUniqueOrThrow({
      where: { id: r.mockExamId },
      include: { sections: { include: { items: true } } },
    });
    console.log(`+ examen assemble : ${e.title}`);
    for (const s of e.sections) console.log(`   ${s.section} — ${s.durationMin} min — ${s.items.length} item(s)`);
  } else if (r.raison === "BANQUE_INSUFFISANTE") {
    console.log("! banque insuffisante :");
    r.manques.forEach((m) => console.log(`   - ${m}`));
  } else {
    console.log("! blueprint introuvable");
  }

  await db.$disconnect();
}

void main();
