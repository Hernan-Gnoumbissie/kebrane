/**
 * Coordonnées de la plateforme, vues depuis l'administration (KB-15).
 *
 * Module sans dépendance : importé par le layout racine, qui ne doit pas tirer
 * la couche données.
 *
 * Même topologie que le reste : sous-domaines d'un domaine racine commun
 * (`admin.kebrane.com`, `app.kebrane.com`) ⇒ une seule instance Clerk, cookie
 * sur `.kebrane.com`, session partagée sans configuration « satellite ».
 */

/** URL publique de cette console. */
export const KEBRANE_ADMIN_URL =
  process.env.NEXT_PUBLIC_KEBRANE_ADMIN_URL ?? "http://localhost:3002";

/** URL publique du hub — où l'on gère son compte et sa double authentification. */
export const KEBRANE_HUB_URL =
  process.env.NEXT_PUBLIC_KEBRANE_HUB_URL ?? "http://localhost:3001";

/**
 * Origines vers lesquelles Clerk accepte de rediriger après connexion.
 *
 * Le hub y figure : le membre du personnel à qui il manque la double
 * authentification doit pouvoir aller l'activer sur son compte, puis revenir.
 * Sans cette origine, Clerk refuserait le retour.
 */
export const ALLOWED_REDIRECT_ORIGINS = [KEBRANE_ADMIN_URL, KEBRANE_HUB_URL];
