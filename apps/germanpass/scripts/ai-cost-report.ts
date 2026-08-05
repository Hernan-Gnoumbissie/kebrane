/**
 * Coût réel des appels IA, par type et par modèle (KB-13 — tarification).
 *
 *   pnpm --filter @kebrane/germanpass ai:cost
 *
 * Sert à calibrer l'enveloppe de corrections incluse dans chaque offre. Les
 * estimations faites avant le lancement reposent sur des hypothèses de longueur
 * de copie ; ce rapport les remplace par des chiffres. À rejouer dès qu'une
 * cinquantaine de corrections réelles sont passées, puis à chaque changement de
 * modèle — c'est le modèle qui fait le coût.
 */
import { db } from "@/lib/db";

const CORRECTION_KINDS = ["writing_eval", "speaking_eval"];

async function main() {
  const total = await db.aiUsage.count();
  console.log(`Lignes dans ai_usage : ${total}\n`);
  if (total === 0) {
    console.log("Base vide — aucun chiffre réel disponible.");
    return;
  }

  const rows = await db.aiUsage.groupBy({
    by: ["kind"],
    _count: { _all: true },
    _avg: { costUsd: true, inputTokens: true, outputTokens: true, latencyMs: true },
    _sum: { costUsd: true },
  });

  console.log("kind".padEnd(16), "n".padStart(6), "coût moyen $".padStart(14), "in tok".padStart(9), "out tok".padStart(9));
  for (const r of rows.sort((a, b) => b._count._all - a._count._all)) {
    console.log(
      r.kind.padEnd(16),
      String(r._count._all).padStart(6),
      Number(r._avg.costUsd ?? 0).toFixed(6).padStart(14),
      Math.round(r._avg.inputTokens ?? 0).toString().padStart(9),
      Math.round(r._avg.outputTokens ?? 0).toString().padStart(9)
    );
  }

  const corr = rows.filter((r) => CORRECTION_KINDS.includes(r.kind));
  const n = corr.reduce((s, r) => s + r._count._all, 0);
  if (n > 0) {
    const totalCost = corr.reduce((s, r) => s + Number(r._sum.costUsd ?? 0), 0);
    const moyenne = totalCost / n;
    console.log(`\nCorrections (${CORRECTION_KINDS.join(" + ")}) : ${n} appels`);
    console.log(`Coût moyen d'une correction : $${moyenne.toFixed(6)}`);
    console.log(`40 corrections : $${(moyenne * 40).toFixed(4)}  (~${Math.round(moyenne * 40 * 600)} FCFA à 600 F/$)`);
  } else {
    console.log("\nAucune correction (writing_eval / speaking_eval) enregistrée.");
  }

  // Modèles réellement utilisés : le coût dépend d'eux en premier lieu.
  const models = await db.aiUsage.groupBy({
    by: ["model"],
    _count: { _all: true },
    _avg: { costUsd: true },
  });
  console.log("\nPar modèle :");
  for (const m of models) {
    console.log(`  ${m.model.padEnd(28)} ${String(m._count._all).padStart(5)} appels, moyenne $${Number(m._avg.costUsd ?? 0).toFixed(6)}`);
  }
}

main()
  .catch((e) => {
    console.error("[ai-cost-report] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
