/**
 * Attribution d'un rôle Kebrane depuis la ligne de commande (KB-20).
 *
 *   pnpm --filter @kebrane/core grant-admin <email> [MEMBER|STAFF|ADMIN]
 *
 * Sert deux cas :
 *  - **bootstrap** du tout premier administrateur, quand aucun admin n'existe
 *    encore pour en promouvoir un autre (l'alternative sans intervention étant
 *    `KEBRANE_BOOTSTRAP_ADMIN_EMAIL`, appliqué à la création du compte) ;
 *  - **exploitation** courante tant qu'`admin.kebrane.com` (KB-15) n'existe pas.
 *
 * Le compte doit exister : on ne crée pas d'identité ici. Le parcours normal est
 * donc « la personne s'inscrit (Clerk crée son compte Core via le webhook KB-17),
 * puis on la promeut ». Passe par l'interface de services, jamais par les tables.
 */
import { accounts, Role } from "../src/index";

const USAGE = "usage : pnpm --filter @kebrane/core grant-admin <email> [MEMBER|STAFF|ADMIN]";

async function main(): Promise<void> {
  const [emailArg, roleArg = "ADMIN"] = process.argv.slice(2);

  if (!emailArg) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const role = roleArg.toUpperCase();
  if (!(role in Role)) {
    console.error(`Rôle inconnu : « ${roleArg} ». Attendu : ${Object.keys(Role).join(", ")}.`);
    process.exitCode = 1;
    return;
  }

  const email = emailArg.trim().toLowerCase();
  const account = await accounts.findByEmail(email);
  if (!account) {
    // Message explicite : l'erreur la plus probable est d'avoir lancé le script
    // avant que la personne ne se soit inscrite.
    console.error(
      `Aucun compte Kebrane pour « ${email} ».\n` +
        "Le compte doit exister : demandez à la personne de créer son compte, puis relancez."
    );
    process.exitCode = 1;
    return;
  }

  if (account.role === role) {
    console.log(`  = ${email} est déjà ${role} — rien à faire.`);
    return;
  }

  const before = account.role;
  const updated = await accounts.setRole(account.id, role as Role, { source: "grant-admin" });
  console.log(`  ✓ ${email} : ${before} → ${updated!.role} (journalisé, gravité IMPORTANT)`);
}

main()
  .catch((e) => {
    console.error("[grant-admin] échec :", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { db } = await import("@kebrane/db");
    await db.$disconnect();
  });
