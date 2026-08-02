/**
 * Reprise de l'existant GermanPass -> plateforme Kebrane (KB-08/KB-09).
 *
 *   pnpm --filter @kebrane/germanpass kebrane:backfill
 *
 * Pourquoi ce script. La synchronisation « au fil de l'eau » se déclenche sur un
 * CHANGEMENT (liaison Clerk, activation, suspension, expiration). Les comptes
 * déjà liés à Clerk AVANT la mise en place du pont ne changent, eux, jamais
 * d'état : sans reprise, leur carte resterait « À souscrire » dans le hub alors
 * que leur accès est valide. Ce script rejoue une fois la synchronisation pour
 * tout le monde.
 *
 * Idempotent (côté Core, `access.sync` n'écrit que si l'état change) : rejouable
 * sans risque, y compris après chaque déploiement.
 *
 * Prérequis : `KEBRANE_DATABASE_URL` défini et le registre produits semé
 * (`pnpm --filter @kebrane/core seed`), sinon il n'y a rien à refléter.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { CORE_ENABLED, syncKebraneAccess, toKebraneAccessStatus } from "@/lib/kebrane";

async function main(): Promise<void> {
  if (!CORE_ENABLED) {
    console.error(
      "[backfill] KEBRANE_DATABASE_URL n'est pas défini : le pont vers Core est désactivé. Rien à faire."
    );
    process.exitCode = 1;
    return;
  }

  // Seuls les comptes portant une identité Clerk ont un compte Kebrane possible.
  const users = await db.user.findMany({
    where: { clerkUserId: { not: null }, status: { not: "DELETED" } },
    select: {
      id: true,
      email: true,
      name: true,
      clerkUserId: true,
      status: true,
      plan: true,
      accessUntil: true,
    },
  });

  console.log(`[backfill] ${users.length} compte(s) lié(s) à Clerk à refléter dans Core.`);

  const tally = new Map<string, number>();
  let done = 0;
  for (const user of users) {
    const status = toKebraneAccessStatus(user);
    await syncKebraneAccess(user);
    tally.set(status, (tally.get(status) ?? 0) + 1);
    done += 1;
    if (done % 50 === 0) console.log(`  … ${done}/${users.length}`);
  }

  console.log("[backfill] terminé. Répartition des statuts d'accès :");
  for (const [status, count] of [...tally].sort()) {
    console.log(`    ${status.padEnd(10)} ${count}`);
  }
}

main()
  .catch((e) => {
    console.error("[backfill] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
