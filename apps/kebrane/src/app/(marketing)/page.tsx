import type * as React from "react";
import Link from "next/link";
import { products as coreProducts, PRODUCT_REGISTRY, ProductStatus } from "@kebrane/core";
import type { Product } from "@kebrane/core";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  ByKebrane,
  KebraneSymbol,
} from "@kebrane/ui";

// Le catalogue est lu dans le REGISTRE Core, comme le hub (KB-19). Il vivait ici
// en dur : deux catalogues côte à côte, donc dérive garantie dès qu'un produit
// change de nom, d'accent ou de statut.
export const dynamic = "force-dynamic";

interface CatalogueEntry {
  slug: string;
  name: string;
  tagline: string | null;
  accent: string | null;
  /** Non nulle seulement si le produit est ouvert. */
  url: string | null;
  available: boolean;
}

/**
 * Catalogue affiché par la vitrine.
 *
 * Repli si la base Core est indisponible : le REGISTRE DÉCLARATIF
 * (`PRODUCT_REGISTRY`), c'est-à-dire exactement ce que le seed applique en base.
 * La vitrine reste donc debout sans base — et le repli ne peut pas diverger du
 * catalogue réel, puisque c'est la même source.
 */
async function loadCatalogue(): Promise<CatalogueEntry[]> {
  const open = (status: ProductStatus, url: string | null | undefined) =>
    status === ProductStatus.ACTIVE && Boolean(url);

  try {
    // `listPublic` et non `list` : un produit retiré du catalogue (`DISABLED`)
    // ne doit pas réapparaître ici en « Bientôt disponible ».
    const registered: Product[] = await coreProducts.listPublic();
    if (registered.length > 0) {
      return registered.map((p) => ({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        accent: p.accentColor,
        url: open(p.status, p.url) ? p.url : null,
        available: open(p.status, p.url),
      }));
    }
    console.warn("[landing] registre produits vide — repli sur le déclaratif (seed à jouer ?)");
  } catch (e) {
    console.warn("[landing] registre produits illisible — repli sur le déclaratif :", e);
  }

  return PRODUCT_REGISTRY.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    accent: d.accentColor,
    url: open(d.status, d.url) ? d.url! : null,
    available: open(d.status, d.url),
  }));
}

/** Produits disposant d'une page de présentation dédiée (KB-31). */
const PAGES_PRODUIT: Record<string, string> = {
  germanpass: "/produits/germanpass",
};

export default async function Home() {
  const catalogue = await loadCatalogue();

  return (
    <>
      {/* `relative` + `overflow-hidden` : le filigrane déborde volontairement à
          droite et doit être rogné, pas provoquer un défilement horizontal. */}
      <section className="relative overflow-hidden py-16 md:py-24">
        {/* Filigrane : le symbole « A ouvert » de la charte, très pâle, décalé.
            Décoratif au sens strict — `aria-hidden`, aucune information n'y est
            portée. On réutilise la marque plutôt qu'une image d'ambiance : c'est
            la seule illustration dont on soit sûr qu'elle nous appartienne et
            qu'elle dise quelque chose. */}
        <KebraneSymbol
          decoratif
          className="pointer-events-none absolute -right-16 -top-10 hidden h-[26rem] select-none text-primary/[0.04] md:block"
        />

        <p className="kb-apparition mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block h-px w-8 bg-accent" aria-hidden="true" />
          La maison edtech
        </p>
        <h1
          className="kb-apparition max-w-3xl text-4xl font-bold leading-tight text-primary md:text-6xl"
          style={{ "--kb-delai": "60ms" } as React.CSSProperties}
        >
          Un compte Kebrane,<br />tous les produits.
        </h1>
        {/* Accroche de mission tirée du Manifeste (brand/docs/Le-Manifeste-de-Kebrane.md) :
            faire tomber les barrières subies, bâtir des passerelles et non des
            destinations. Registre « vous » (institutionnel), voix sobre. */}
        <p
          className="kb-apparition mt-5 max-w-2xl text-lg text-muted-foreground"
          style={{ "--kb-delai": "140ms" } as React.CSSProperties}
        >
          Il y a des barrières qu&apos;on n&apos;a pas choisies — une langue, un examen, un
          certificat. Kebrane construit les outils pour les franchir : des passerelles que vous
          traversez, puis que vous quittez, plus libres qu&apos;avant.
        </p>
        <p
          className="kb-apparition mt-3 max-w-xl text-muted-foreground"
          style={{ "--kb-delai": "200ms" } as React.CSSProperties}
        >
          Une seule identité pour tous nos produits, dans le même cadre clair et sobre.
        </p>
        <div
          className="kb-apparition mt-8 flex flex-wrap gap-3"
          style={{ "--kb-delai": "260ms" } as React.CSSProperties}
        >
          <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Créer un compte
          </Link>
          <a href="#produits" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Découvrir les produits
          </a>
        </div>
      </section>

      <section id="produits" aria-labelledby="titre-produits" className="pb-20">
        <h2
          id="titre-produits"
          className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Les produits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {catalogue.map((p) => {
            const pageProduit = PAGES_PRODUIT[p.slug];
            return (
              <Card key={p.slug} className="flex flex-col">
                <CardHeader className="flex-1">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
                    >
                      {p.accent ? (
                        <span
                          className="h-2.5 w-2.5 rounded-pill"
                          style={{ backgroundColor: p.accent }}
                          aria-hidden="true"
                        />
                      ) : null}
                      <ByKebrane />
                    </span>
                    <span
                      className={
                        p.available
                          ? "rounded-pill bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                          : "rounded-pill bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                      }
                    >
                      {p.available ? "Disponible" : "Bientôt"}
                    </span>
                  </div>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>{p.tagline ?? "Bientôt disponible."}</CardDescription>
                </CardHeader>
                <div className="flex flex-wrap gap-2 p-6 pt-0">
                  {/* La page produit est la page de CONVERSION (KB-31) : quand
                      elle existe, c'est elle qu'on met en avant, pas le saut
                      direct dans l'application. */}
                  {pageProduit ? (
                    <Link
                      href={pageProduit}
                      className={buttonVariants({ variant: "primary", size: "sm" })}
                    >
                      En savoir plus
                    </Link>
                  ) : null}
                  {p.url ? (
                    <a
                      href={p.url}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Ouvrir
                    </a>
                  ) : pageProduit ? null : (
                    <span className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Bientôt disponible
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}
