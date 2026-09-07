import type { Metadata } from "next";
import Link from "next/link";
import { products as coreProducts, PRODUCT_REGISTRY, ProductStatus } from "@kebrane/core";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  ByKebrane,
} from "@kebrane/ui";

// Lit le registre Core comme la vitrine (KB-19) : nom, accroche et URL du
// produit ne sont pas recopiés ici.
export const dynamic = "force-dynamic";

const SLUG = "germanpass";

export const metadata: Metadata = {
  title: "GermanPass — préparation aux examens d'allemand",
  description:
    "Entraînement aux quatre compétences, du A1 au C2 : sujets originaux, examens blancs et corrections par IA à titre indicatif.",
  alternates: { canonical: "/produits/germanpass" },
};

/** Coordonnées du produit : la base d'abord, le registre déclaratif en repli. */
async function chargerProduit() {
  const declaratif = PRODUCT_REGISTRY.find((p) => p.slug === SLUG)!;
  try {
    const enregistre = await coreProducts.bySlug(SLUG);
    if (enregistre) return enregistre;
    console.warn("[germanpass] produit absent du registre en base — repli sur le déclaratif");
  } catch (e) {
    console.warn("[germanpass] registre illisible — repli sur le déclaratif :", e);
  }
  return {
    name: declaratif.name,
    tagline: declaratif.tagline,
    url: declaratif.url ?? null,
    status: declaratif.status,
  };
}

const NIVEAUX = ["A1", "A2", "B1", "B2", "C1", "C2"];

const EPREUVES = [
  {
    titre: "Lesen — compréhension écrite",
    detail: "Textes calibrés par niveau, questions au format des épreuves officielles.",
  },
  {
    titre: "Hören — compréhension orale",
    detail: "Documents audio originaux, avec le nombre d'écoutes de l'épreuve réelle.",
  },
  {
    titre: "Schreiben — expression écrite",
    detail: "Productions corrigées point par point, selon les critères publics du barème.",
  },
  {
    titre: "Sprechen — expression orale",
    detail: "Enregistrement, transcription et retour structuré sur la production.",
  },
];

export default async function GermanPassPage() {
  const produit = await chargerProduit();
  const ouvert = produit.status === ProductStatus.ACTIVE && Boolean(produit.url);

  return (
    <div className="py-12 md:py-16">
      <header className="max-w-3xl space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block h-px w-8 bg-accent" aria-hidden="true" />
          <ByKebrane />
        </p>
        <h1 className="text-4xl font-bold leading-tight text-primary md:text-5xl">
          {produit.name}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{produit.tagline}</p>

        <div className="flex flex-wrap gap-3 pt-3">
          <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Créer un compte
          </Link>
          {ouvert ? (
            <a href={produit.url!} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Ouvrir {produit.name}
            </a>
          ) : null}
          <Link href="/tarifs" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Voir les tarifs
          </Link>
        </div>
      </header>

      <section aria-labelledby="titre-niveaux" className="mt-16 max-w-3xl space-y-4">
        <h2
          id="titre-niveaux"
          className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Du débutant au niveau expert
        </h2>
        <ul className="flex flex-wrap gap-2" aria-label="Niveaux couverts, du A1 au C2">
          {NIVEAUX.map((niveau) => (
            <li
              key={niveau}
              className="rounded-pill border border-border bg-card px-4 py-1.5 text-sm font-medium text-primary"
            >
              {niveau}
            </li>
          ))}
        </ul>
        <p className="leading-relaxed text-muted-foreground">
          Le parcours suit l&apos;échelle du Cadre européen commun de référence. Vous travaillez
          au niveau que vous visez, sans repasser par ce que vous savez déjà.
        </p>
      </section>

      <section aria-labelledby="titre-epreuves" className="mt-16">
        <h2
          id="titre-epreuves"
          className="mb-6 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Les quatre épreuves
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {EPREUVES.map((epreuve) => (
            <Card key={epreuve.titre}>
              <CardHeader>
                <CardTitle className="text-lg">{epreuve.titre}</CardTitle>
                <CardDescription>{epreuve.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="titre-essai" className="mt-16 max-w-3xl space-y-3">
        <h2
          id="titre-essai"
          className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Essayer avant de payer
        </h2>
        {/* Ce paragraphe décrit le palier gratuit tel que le CODE le définit :
            `FREE_CAPABILITIES` (cours, examens blancs, progression) et
            `FREE_AI_CORRECTIONS`, un nombre de corrections offertes — et non une
            enveloppe en argent, pour que la promesse ne bouge pas quand les
            estimations de coût bougent. Si l'un des deux change, ce texte doit
            changer avec. */}
        <p className="leading-relaxed text-muted-foreground">
          Les cours, les examens blancs et le suivi de progression sont en accès libre, sans
          paiement. Une <strong className="font-medium text-foreground">correction écrite</strong>{" "}
          vous est offerte pour juger sur pièce du retour que vous achetez — l&apos;abonnement
          n&apos;ouvre pas un contenu caché, il lève la limite sur les corrections.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Les évaluations produites par intelligence artificielle sont{" "}
          <strong className="font-medium text-foreground">indicatives</strong> et ne préjugent pas
          du résultat à un examen officiel.
        </p>
      </section>

      <section aria-labelledby="titre-independance" className="mt-16 max-w-3xl space-y-3">
        <h2
          id="titre-independance"
          className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Indépendance
        </h2>
        <p className="leading-relaxed text-muted-foreground">
          {produit.name} est <strong className="font-medium text-foreground">indépendant</strong>{" "}
          et n&apos;est affilié à aucun organisme certificateur. Aucun sujet officiel n&apos;est
          reproduit : tout le contenu d&apos;entraînement est original, et seules les structures
          publiques des épreuves sont respectées — voir les{" "}
          <Link href="/mentions-legales" className="underline underline-offset-4">
            Mentions légales
          </Link>
          .
        </p>
      </section>

      <section className="mt-16 rounded-lg border border-border bg-card p-8">
        <h2 className="font-serif text-2xl font-semibold text-primary">Commencer maintenant</h2>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Un compte Kebrane suffit : il vous ouvre {produit.name} et, demain, les autres produits
          de la maison.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Créer un compte
          </Link>
          <Link href="/tarifs" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Voir les tarifs
          </Link>
        </div>
      </section>
    </div>
  );
}
