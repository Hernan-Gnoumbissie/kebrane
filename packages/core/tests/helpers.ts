// Outillage commun aux tests de @kebrane/core (KB-18).
//
// ⚠ Ces tests parlent à une VRAIE base PostgreSQL. C'est délibéré : ce qu'ils
// vérifient — idempotence, contraintes d'unicité, upsert, émission d'événement
// — est du comportement de base de données. Le simuler ne prouverait que la
// fidélité du simulacre.
//
// Ils sont donc conçus pour être rejouables sur la base de DEV sans la salir :
// chaque exécution travaille sur des identifiants uniques et nettoie derrière
// elle (voir `cleanup`).
import { db } from "@kebrane/db";

if (!process.env.KEBRANE_DATABASE_URL && !process.env.DATABASE_URL) {
  console.error(
    "Les tests @kebrane/core exigent une base : renseignez KEBRANE_DATABASE_URL " +
      "(voir packages/db/.env.example)."
  );
  process.exit(1);
}

/** Suffixe unique par exécution : deux lancements simultanés ne se marchent pas dessus. */
export const RUN = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export const testEmail = (label: string) => `kb18.${label}.${RUN}@example.test`;
export const testClerkId = (label: string) => `user_kb18_${label}_${RUN}`;
export const testSlug = (label: string) => `kb18-${label}-${RUN}`;

/** Comptes/produits créés par un fichier de test, à supprimer à la fin. */
export function tracker() {
  const accountIds = new Set<string>();
  const productSlugs = new Set<string>();

  return {
    account: (id: string) => accountIds.add(id),
    product: (slug: string) => productSlugs.add(slug),
    /** Supprime tout ce qui a été créé. Les accès et événements suivent en cascade
     *  (`onDelete: Cascade` / `SetNull`) ; on purge les événements explicitement
     *  car ils survivent au compte (`SetNull`). */
    async cleanup() {
      for (const id of accountIds) {
        await db.event.deleteMany({ where: { accountId: id } });
        await db.account.deleteMany({ where: { id } });
      }
      for (const slug of productSlugs) {
        await db.product.deleteMany({ where: { slug } });
      }
    },
  };
}

/** Nombre d'événements d'un type donné pour un compte — l'assertion qui prouve
 *  qu'une opération idempotente n'a PAS réécrit. */
export const countEvents = (accountId: string, type: string) =>
  db.event.count({ where: { accountId, type } });

export { db };
