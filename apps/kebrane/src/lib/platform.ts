/**
 * Coordonnées des produits de la maison, vues depuis le hub Kebrane (KB-10).
 *
 * Module sans dépendance : importé par le layout racine, qui ne doit pas tirer
 * la couche données. L'URL affichée sur une carte produit vient du REGISTRE
 * Core (`products.url`) ; cette liste ne sert qu'aux origines de redirection
 * autorisées par Clerk.
 *
 * Topologie retenue : sous-domaines d'un même domaine racine (`app.kebrane.com`,
 * `germanpass.kebrane.com`) ⇒ une seule instance Clerk, cookie sur
 * `.kebrane.com`, session partagée sans configuration « satellite ».
 */

/** URL publique du hub. */
export const KEBRANE_HUB_URL =
  process.env.NEXT_PUBLIC_KEBRANE_HUB_URL ?? "http://localhost:3001";

/** URL publique de GermanPass (doit correspondre au registre produits Core). */
export const GERMANPASS_URL =
  process.env.NEXT_PUBLIC_GERMANPASS_URL ?? "http://localhost:3000";

/**
 * Origines vers lesquelles Clerk accepte de rediriger après connexion —
 * indispensable pour « hub → produit » et « produit → hub » sans re-login.
 */
export const ALLOWED_REDIRECT_ORIGINS = [KEBRANE_HUB_URL, GERMANPASS_URL];
