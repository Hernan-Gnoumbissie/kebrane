/**
 * Coordonnées de la plateforme Kebrane vues depuis GermanPass (KB-10).
 *
 * Module VOLONTAIREMENT sans dépendance (ni Prisma, ni Core) : il est importé
 * par le layout racine et par le header, qui ne doivent pas tirer la couche
 * données. Le pont métier vers Core reste `lib/kebrane.ts`.
 *
 * Topologie retenue : **sous-domaines d'un même domaine racine**
 * (`app.kebrane.com` = hub, `germanpass.kebrane.com` = produit). Une seule
 * instance Clerk, cookie de session posé sur `.kebrane.com` : la session est
 * donc partagée sans configuration « satellite ». En dev, `localhost:3001` et
 * `localhost:3000` partagent aussi leurs cookies (même hôte, ports différents)
 * — le SSO fonctionne tel quel.
 *
 * Le mode « satellite » (domaines racines DIFFÉRENTS) reste disponible par env
 * si la décision PO change : voir NEXT_PUBLIC_CLERK_IS_SATELLITE / _DOMAIN.
 */

/** Hub du compte Kebrane — « Mon compte Kebrane » / retour depuis le produit. */
export const KEBRANE_HUB_URL =
  process.env.NEXT_PUBLIC_KEBRANE_HUB_URL ?? "http://localhost:3001";

/** URL publique de GermanPass (doit correspondre au registre produits Core). */
export const GERMANPASS_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Origines vers lesquelles Clerk accepte de rediriger après connexion.
 * Sans cette liste, un retour vers le hub après login est refusé.
 */
export const ALLOWED_REDIRECT_ORIGINS = [KEBRANE_HUB_URL, GERMANPASS_URL];

/**
 * Configuration « satellite » Clerk — utile UNIQUEMENT si le hub et le produit
 * vivent sur des domaines racines différents. Vide en topologie sous-domaines.
 */
export const CLERK_SATELLITE =
  process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE === "true"
    ? {
        isSatellite: true as const,
        domain: process.env.NEXT_PUBLIC_CLERK_DOMAIN,
        signInUrl: `${KEBRANE_HUB_URL}/login`,
      }
    : {};
