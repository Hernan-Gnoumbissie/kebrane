import type { Metadata } from "next";
import { checkStaff } from "@kebrane/auth/server";
import {
  plans as corePlans,
  products as coreProducts,
  ALL_CAPABILITIES,
  capabilityLabel,
} from "@kebrane/core";
import { AccesRefuse } from "@/components/acces-refuse";
import { AdminShell } from "@/components/admin-shell";
import { OffreForm, type OffreModifiable } from "./offre-form";

// Une grille tarifaire ne se met pas en cache : l'écran servirait des prix
// qu'un autre administrateur vient de changer.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Offres" };

/**
 * Gestion de la grille tarifaire (KB-34).
 *
 * **Réservé au rôle ADMIN**, et pas seulement STAFF : c'est l'écran qui fixe
 * des prix. Le service `plans.update` refuse de son côté, mais un écran qu'on
 * peut ouvrir sans pouvoir rien y faire est une invitation à l'erreur.
 *
 * Le `PLAN_REGISTRY` du code n'est qu'un seed de démarrage : à partir d'ici,
 * c'est la base qui fait foi, et cet écran en est la seule porte d'écriture.
 */
export default async function OffresPage() {
  const { session, denial } = await checkStaff("ADMIN");
  if (denial) return <AccesRefuse denial={denial} email={session?.account.email} />;

  const produits = await coreProducts.list();
  const parProduit = await Promise.all(
    produits.map(async (produit) => ({
      produit,
      offres: await corePlans.allForProduct(produit.slug),
    }))
  );

  const capacitesDisponibles = ALL_CAPABILITIES.map((cle) => ({
    cle,
    label: capabilityLabel(cle),
  }));

  const avecOffres = parProduit.filter((entree) => entree.offres.length > 0);

  return (
    <AdminShell actif="offres">
      <h1 className="text-2xl font-bold text-primary">Offres</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Les prix affichés sur la page publique <code>/tarifs</code> sont lus ici même. Chaque
        modification est tracée au journal en gravité « à savoir », avec son auteur.
      </p>

      {avecOffres.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Aucune offre en base. Amorcez le catalogue avec le registre déclaratif :{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            pnpm --filter @kebrane/core seed
          </code>
        </p>
      ) : (
        <div className="mt-10 space-y-12">
          {avecOffres.map(({ produit, offres }) => (
            <section key={produit.id} aria-labelledby={`produit-${produit.slug}`}>
              <h2
                id={`produit-${produit.slug}`}
                className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground"
              >
                {produit.name}
              </h2>
              <div className="space-y-4">
                {offres.map((offre) => {
                  const modifiable: OffreModifiable = {
                    productSlug: produit.slug,
                    slug: offre.slug,
                    name: offre.name,
                    description: offre.description,
                    priceAmount: offre.priceAmount,
                    currency: offre.currency,
                    durationDays: offre.durationDays,
                    capabilities: offre.capabilities,
                    aiBudgetMicroUsd: offre.aiBudgetMicroUsd,
                    sortOrder: offre.sortOrder,
                    active: offre.active,
                  };
                  return (
                    <OffreForm
                      key={offre.id}
                      offre={modifiable}
                      capacitesDisponibles={capacitesDisponibles}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        Créer ou retirer une offre passe encore par le registre déclaratif
        (<code>packages/core/src/plans.ts</code>) : cet écran modifie les offres existantes et
        peut les désactiver, ce qui les retire de la vente sans perdre leur historique.
      </p>
    </AdminShell>
  );
}
