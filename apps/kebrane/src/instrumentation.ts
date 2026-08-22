/**
 * Amorçage du hub (KB-21).
 *
 * `register()` est appelé UNE FOIS par Next au démarrage du serveur — c'est le
 * bon endroit pour brancher des services, plutôt qu'un layout réévalué à chaque
 * rendu.
 */
export async function register(): Promise<void> {
  // `nodemailer` et Prisma n'existent pas sur le runtime edge : sans ce garde,
  // l'import ferait échouer le démarrage là-bas.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { bootstrapKebrane } = await import("@kebrane/core");
  await bootstrapKebrane();
}
