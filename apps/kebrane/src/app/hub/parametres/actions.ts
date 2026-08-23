"use server";

import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getKebraneSession } from "@kebrane/auth/server";
import { accounts, privacy } from "@kebrane/core";

export interface EtatSuppression {
  erreur?: string;
}

/**
 * Suppression du compte à la demande du membre (KB-28).
 *
 * L'ordre des trois opérations n'est pas indifférent :
 *
 *  1. **délier** l'identité Clerk (`accounts.unlinkClerk`) ;
 *  2. **effacer** les données personnelles côté Core (`privacy.eraseAccount`) ;
 *  3. **supprimer** l'utilisateur chez Clerk.
 *
 * Clerk en DERNIER, parce que c'est la seule étape qu'on ne peut pas rejouer :
 * si elle passait en premier et que l'effacement échouait ensuite, le membre
 * aurait perdu son moyen de se connecter tout en gardant ses données en base —
 * exactement l'inverse de ce qu'il a demandé, et sans moyen de revenir demander
 * quoi que ce soit. Dans l'ordre retenu, un échec à l'étape 3 laisse un compte
 * déjà anonymisé : le pire cas est une identité Clerk orpheline, que le webhook
 * `user.deleted` ou une reprise manuelle nettoie.
 *
 * Les étapes 1 et 2 sont idempotentes : le webhook Clerk `user.deleted` que
 * déclenchera l'étape 3 rejouera `unlinkClerk` sans rien réécrire.
 */
export async function supprimerMonCompte(): Promise<EtatSuppression> {
  const session = await getKebraneSession();
  if (!session) redirect("/login");

  const { userId } = await auth();

  try {
    if (userId) await accounts.unlinkClerk(userId);
    await privacy.eraseAccount(session.account.id, { source: "self_service" });

    if (userId) {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    }
  } catch (e) {
    console.error("[parametres] suppression de compte en échec :", e);
    // On ne renvoie pas le détail : il n'apprendrait rien au membre et peut
    // contenir des identifiants techniques.
    return {
      erreur:
        "La suppression n'a pas pu aboutir. Réessayez, ou écrivez à rgpd@kebrane.com.",
    };
  }

  // La session Clerk n'existe plus : toute page connectée renverrait vers
  // `/login`. On ramène donc à la vitrine.
  redirect("/");
}
