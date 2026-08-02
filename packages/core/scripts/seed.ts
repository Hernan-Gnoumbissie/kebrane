/**
 * Seed du domaine Kebrane (KB-09) — enregistre les produits de la maison dans
 * le registre `products`. Idempotent : rejouable à chaque déploiement.
 *
 *   pnpm --filter @kebrane/core seed
 *
 * Passe par l'interface de services (`products.syncRegistry`) et jamais par les
 * tables : le seed respecte la même frontière que les produits.
 */
import { products } from "../src/index";

async function main(): Promise<void> {
  const synced = await products.syncRegistry();
  for (const p of synced) {
    console.log(`  ✓ ${p.slug.padEnd(14)} ${p.name} — ${p.status} — accent ${p.accentColor}`);
  }
  console.log(`\n${synced.length} produit(s) enregistré(s) dans le registre Kebrane.`);
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
