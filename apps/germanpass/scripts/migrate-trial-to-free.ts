/**
 * Migration one-shot : comptes bloqués par l'ancien essai 24 h → socle GRATUIT.
 *
 *   Aperçu (DRY-RUN, par défaut, ne modifie rien) :
 *     pnpm --filter @kebrane/germanpass exec tsx scripts/migrate-trial-to-free.ts
 *   Appliquer réellement :
 *     pnpm --filter @kebrane/germanpass exec tsx scripts/migrate-trial-to-free.ts --apply
 *
 * Contexte : le recâblage freemium remplace l'essai 24 h par un accès gratuit
 * PERMANENT. Les comptes déjà passés en EXPIRED (essai grillé) doivent retrouver
 * l'accès gratuit : status ACTIVE, accessUntil = null. Idempotent (une 2e passe
 * ne trouve plus rien) et SANS suppression.
 *
 * Prérequis : les variables d'env de la base germanpass (comme pour `pnpm test`).
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { CORE_ENABLED, syncKebraneAccess } from "@/lib/kebrane";

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const cibles = await db.user.findMany({
    where: { status: "EXPIRED", role: "STUDENT" },
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

  console.log(`[migrate] ${cibles.length} compte(s) EXPIRED (STUDENT) à rétrograder au gratuit.`);
  for (const u of cibles.slice(0, 20)) console.log(`  - ${u.email}`);
  if (cibles.length > 20) console.log(`  … et ${cibles.length - 20} autre(s).`);

  if (!APPLY) {
    console.log("\n[migrate] DRY-RUN : rien n'a été modifié. Relancer avec --apply pour appliquer.");
    return;
  }
  if (cibles.length === 0) {
    console.log("[migrate] Rien à faire.");
    return;
  }

  const res = await db.user.updateMany({
    where: { id: { in: cibles.map((u) => u.id) } },
    data: { status: "ACTIVE", accessUntil: null },
  });
  console.log(`[migrate] ${res.count} compte(s) repassé(s) ACTIVE + accessUntil=null (gratuit permanent).`);

  // Miroir Core : accessUntil null → toKebraneAccessStatus = NONE → palier gratuit.
  if (CORE_ENABLED) {
    let synced = 0;
    for (const u of cibles) {
      try {
        await syncKebraneAccess({ ...u, status: "ACTIVE", accessUntil: null });
        synced += 1;
      } catch (e) {
        console.warn(`[migrate] sync Core échouée pour ${u.email} :`, e);
      }
    }
    console.log(`[migrate] Core synchronisé pour ${synced}/${cibles.length} compte(s).`);
  } else {
    console.log("[migrate] Pont Core désactivé (KEBRANE_DATABASE_URL absent) : pas de miroir Core.");
  }
  console.log("[migrate] Terminé.");
}

main()
  .catch((e) => {
    console.error("[migrate] échec :", e);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
