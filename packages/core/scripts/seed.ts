/**
 * Seed du domaine Kebrane (KB-09) — enregistre les produits de la maison dans
 * le registre `products`. Idempotent : rejouable à chaque déploiement.
 *
 *   pnpm --filter @kebrane/core seed
 *
 * Passe par l'interface de services (`products.syncRegistry`) et jamais par les
 * tables : le seed respecte la même frontière que les produits.
 */
import { products, plans, MICRO_USD_PER_USD } from "../src/index";

async function main(): Promise<void> {
  const synced = await products.syncRegistry();
  for (const p of synced) {
    console.log(`  ✓ ${p.slug.padEnd(14)} ${p.name} — ${p.status} — accent ${p.accentColor}`);
  }
  console.log(`\n${synced.length} produit(s) enregistré(s) dans le registre Kebrane.`);

  // Offres (KB-13). Le seed AMORCE le catalogue ; ensuite c'est la base qui fait
  // foi et l'administrateur qui en fixe prix et composition.
  const offres = await plans.syncRegistry();
  console.log("\nOffres :");
  for (const o of offres) {
    const enveloppe = (o.aiBudgetMicroUsd / MICRO_USD_PER_USD).toFixed(2);
    console.log(
      `  ✓ ${o.slug.padEnd(12)} ${String(o.priceAmount).padStart(6)} ${o.currency} · ` +
        `${String(o.durationDays).padStart(3)} j · enveloppe IA ${enveloppe} $ · ` +
        `${o.capabilities.length} capacités`
    );
  }
  console.log(`\n${offres.length} offre(s) enregistrée(s).`);
}

main()
  .catch((e) => {
    console.error("[seed] échec :", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { db } = await import("@kebrane/db");
    await db.$disconnect();
  });
