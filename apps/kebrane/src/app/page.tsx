import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { products as coreProducts, PRODUCT_REGISTRY, ProductStatus } from "@kebrane/core";
import type { Product } from "@kebrane/core";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  KebraneLogo,
  ByKebrane,
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
    const registered: Product[] = await coreProducts.list();
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

export default async function Home() {
  const [{ userId }, catalogue] = await Promise.all([auth(), loadCatalogue()]);
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-5">
        <KebraneLogo />
        <nav className="flex items-center gap-3">
          {userId ? (
            <>
              <Link href="/hub" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Mon espace
              </Link>
              <UserButton />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Se connecter
              </Link>
              <Link href="/register" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </header>

      <main id="contenu" className="flex-1">
        <section className="py-16 md:py-24">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-accent" aria-hidden="true" />
            La maison edtech
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-primary md:text-6xl">
            Un compte Kebrane,<br />tous les produits.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Une seule identité pour préparer vos examens, apprendre et progresser — chaque produit
            dans le même cadre, clair et sobre.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
            {catalogue.map((p) => (
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
                <div className="p-6 pt-0">
                  {p.url ? (
                    <a
                      href={p.url}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Bientôt disponible
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-border py-6 text-sm text-muted-foreground">
        <ByKebrane />
        <span>© {new Date().getFullYear()} Kebrane</span>
      </footer>
    </div>
  );
}
