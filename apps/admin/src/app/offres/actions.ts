"use server";

import { revalidatePath } from "next/cache";
import { checkStaff } from "@kebrane/auth/server";
import { plans, isKnownCapability, type Capability } from "@kebrane/core";

export interface EtatFormulaire {
  erreur?: string;
  succes?: string;
}

/** Entier lu dans un formulaire, ou `null` si la saisie n'en est pas un. */
function entier(donnees: FormData, cle: string): number | null {
  const brut = donnees.get(cle);
  if (typeof brut !== "string" || brut.trim() === "") return null;
  const valeur = Number(brut);
  return Number.isInteger(valeur) ? valeur : null;
}

function texte(donnees: FormData, cle: string): string {
  const brut = donnees.get(cle);
  return typeof brut === "string" ? brut.trim() : "";
}

/**
 * Enregistre une offre modifiée depuis l'écran d'administration (KB-34).
 *
 * La garde est refaite ici : une action serveur est un point d'entrée HTTP
 * comme un autre, et le fait que le formulaire ne s'affiche que pour un
 * administrateur ne prouve rien sur qui l'appelle. `plans.update` revérifie le
 * rôle de son côté — c'est voulu, la ceinture et les bretelles ne coûtent rien
 * quand il s'agit de prix.
 */
export async function modifierOffre(
  _etat: EtatFormulaire,
  donnees: FormData
): Promise<EtatFormulaire> {
  const { session, denial } = await checkStaff("ADMIN");
  if (denial || !session) {
    return { erreur: "Action réservée aux administrateurs authentifiés en double facteur." };
  }

  const productSlug = texte(donnees, "productSlug");
  const planSlug = texte(donnees, "planSlug");
  if (!productSlug || !planSlug) return { erreur: "Offre non identifiée." };

  const nom = texte(donnees, "name");
  if (!nom) return { erreur: "Le nom de l'offre est obligatoire." };

  const prix = entier(donnees, "priceAmount");
  const duree = entier(donnees, "durationDays");
  const enveloppe = entier(donnees, "aiBudgetMicroUsd");
  const ordre = entier(donnees, "sortOrder");

  if (prix === null) return { erreur: "Le prix doit être un nombre entier." };
  if (duree === null) return { erreur: "La durée doit être un nombre entier de jours." };
  if (enveloppe === null) return { erreur: "L'enveloppe IA doit être un nombre entier." };
  if (ordre === null) return { erreur: "L'ordre d'affichage doit être un nombre entier." };

  const devise = texte(donnees, "currency").toUpperCase();
  if (!/^[A-Z]{3}$/.test(devise)) {
    return { erreur: "La devise doit être un code ISO à trois lettres (ex. XAF)." };
  }

  // Les capacités cochées sont revalidées : le navigateur n'est pas une source
  // de vérité sur ce qui existe.
  const capacites: Capability[] = [];
  for (const brut of donnees.getAll("capabilities")) {
    if (typeof brut !== "string") continue;
    if (!isKnownCapability(brut)) return { erreur: `Capacité inconnue : ${brut}` };
    capacites.push(brut);
  }
  if (capacites.length === 0) {
    return { erreur: "Une offre doit inclure au moins une capacité." };
  }

  const description = texte(donnees, "description");

  try {
    await plans.update(
      productSlug,
      planSlug,
      {
        name: nom,
        description: description || null,
        priceAmount: prix,
        currency: devise,
        durationDays: duree,
        aiBudgetMicroUsd: enveloppe,
        sortOrder: ordre,
        capabilities: capacites,
        // Case décochée = absente du formulaire. Le formulaire étant complet,
        // l'absence vaut bien « désactivée ».
        active: donnees.get("active") === "on",
      },
      { actor: session.account, source: "admin_ui" }
    );
  } catch (e) {
    console.error("[offres] modification refusée :", e);
    return {
      erreur: e instanceof Error ? e.message : "La modification n'a pas pu être enregistrée.",
    };
  }

  // La grille publique est en `force-dynamic` : elle n'a rien à revalider.
  // Ici, en revanche, la liste doit refléter ce qu'on vient d'écrire.
  revalidatePath("/offres");
  return { succes: "Offre enregistrée." };
}
