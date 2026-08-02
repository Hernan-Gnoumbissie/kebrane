// @kebrane/auth — wrapper Clerk partagé (client).
// Rempli à la Phase D : ré-exports client Clerk, hooks, garde de rôles.
// Objectif : aucune app ne dépend directement de @clerk/nextjs ;
// on passe toujours par cette couche pour pouvoir changer de provider.

export const KEBRANE_AUTH_PLACEHOLDER = true;
