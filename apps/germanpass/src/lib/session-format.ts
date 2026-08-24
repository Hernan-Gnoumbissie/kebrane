/**
 * Format des identifiants de session (KB-39).
 *
 * Module volontairement PUR : aucun import de base, de Clerk ni de guard. Le
 * prédicat vivait dans `guards.ts`, dont l'import tire toute la pile
 * d'authentification (`@/auth` → Clerk → Prisma) ; un test unitaire qui
 * l'importait restait bloqué sur l'ouverture de connexion au lieu de vérifier
 * une comparaison de chaînes.
 */

/**
 * Un identifiant de session Clerk est toujours préfixé `sess_`.
 *
 * Sert à distinguer une session réelle d'un résidu de next-auth (UUID) laissé
 * par la migration : comparer un tel UUID à une session Clerk revenait à
 * refuser l'utilisateur à chaque requête gardée.
 */
export function estIdentifiantSessionClerk(sid: string): boolean {
  return sid.startsWith("sess_");
}
