import type { Metadata } from "next";
import Link from "next/link";
import {
  plans as corePlans,
  capabilityLabel,
  estimatedWritingCorrections,
} from "@kebrane/core";
import type { PlanCatalogueEntry } from "@kebrane/core";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  formatDuree,
  formatEquivalentEur,
  formatMontant,
  XAF_PAR_EUR,
} from "@kebrane/ui";

/**
 * Grille tarifaire publique (KB-34).
 *
 * **Aucun montant n'est écrit dans ce fichier.** Les offres sont lues en direct
 * depuis Core, qui les lit en base : l'administrateur change un prix depuis
 * `admin.kebrane.com` et la page le reflète à la visite suivante, sans
 * redéploiement. C'est la raison d'être du `force-dynamic` ci-dessous — une
 * page de prix mise en cache est une page de prix faux.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Les offres d'abonnement aux produits Kebrane, en FCFA, payables par mobile money.",
  alternates: { canonical: "/tarifs" },
};

type Grille =
  | { etat: "ok"; entrees: PlanCatalogueEntry[] }
  | { etat: "vide" }
  | { etat: "indisponible" };

/**
 * Repli si la base est injoignable.
 *
 * Contrairement à la vitrine (KB-19), on **ne se rabat pas** sur le registre
 * déclaratif : `PLAN_REGISTRY` n'est qu'un seed de démarrage, et rien ne
 * garantit qu'il corresponde encore aux prix pratiqués une fois que
 * l'administration y a touché. Afficher un prix périmé sur une page de vente
 * est pire que ne rien afficher — le prix affiché est celui qui engage
 * (voir CGV, article 3).
 */
async function chargerGrille(): Promise<Grille> {
  try {
    const entrees = await corePlans.catalogue();
    return entrees.length > 0 ? { etat: "ok", entrees } : { etat: "vide" };
  } catch (e) {
    console.warn("[tarifs] catalogue des offres illisible :", e);
    return { etat: "indisponible" };
  }
}

function OffreCard({
  offre,
}: {
  offre: PlanCatalogueEntry["plans"][number];
}) {
  const corrections = estimatedWritingCorrections(offre.aiBudgetMicroUsd);
  const equivalentEur = formatEquivalentEur(offre.priceAmount, offre.currency);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{offre.name}</CardTitle>
        <p className="pt-1 font-serif text-3xl font-bold text-primary">
          {formatMontant(offre.priceAmount, offre.currency)}
        </p>
        {/* Équivalent euro pour la diaspora, qui finance une part des
            abonnements depuis la zone euro. Discret et précédé de « environ » :
            le montant qui engage est celui en FCFA, l'euro n'est qu'un repère. */}
        {equivalentEur ? (
          <p className="text-sm text-muted-foreground">environ {equivalentEur}</p>
        ) : null}
        {/* La durée vient du champ `durationDays`, pas du texte libre : c'est la
            seule des deux que l'on peut garantir exacte. La description reste
            en dessous, telle que l'administration l'a saisie. */}
        <CardDescription>{formatDuree(offre.durationDays)} d&apos;accès</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {offre.description ? (
          <p className="mb-4 text-sm text-muted-foreground">{offre.description}</p>
        ) : null}
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {offre.capabilities.map((cle) => (
            <li key={cle} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                ·
              </span>
              {capabilityLabel(cle)}
            </li>
          ))}
          {corrections > 0 ? (
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                ·
              </span>
              Enveloppe d&apos;environ {corrections} corrections écrites
            </li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function TarifsPage() {
  const grille = await chargerGrille();

  return (
    <div className="py-12 md:py-16">
      <header className="max-w-3xl space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block h-px w-8 bg-accent" aria-hidden="true" />
          Offres
        </p>
        <h1 className="text-4xl font-bold leading-tight text-primary md:text-5xl">Tarifs</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Les cours, les examens blancs et le suivi de progression sont en accès libre.
          L&apos;abonnement lève la limite sur les corrections par IA.
        </p>
      </header>

      {grille.etat === "ok" ? (
        <div className="mt-14 space-y-14">
          {grille.entrees.map(({ product, plans }) => (
            <section key={product.id} aria-labelledby={`offres-${product.slug}`}>
              <h2
                id={`offres-${product.slug}`}
                className="mb-1 font-serif text-2xl font-semibold text-primary"
              >
                {product.name}
              </h2>
              {product.tagline ? (
                <p className="mb-6 text-muted-foreground">{product.tagline}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((offre) => (
                  <OffreCard key={offre.id} offre={offre} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="mt-14 max-w-2xl">
          <CardHeader>
            <CardTitle>
              {grille.etat === "vide"
                ? "Aucune offre n'est ouverte à la vente"
                : "Tarifs momentanément indisponibles"}
            </CardTitle>
            <CardDescription>
              {grille.etat === "vide"
                ? "Les abonnements ne sont pas encore ouverts. Créez votre compte pour utiliser dès maintenant ce qui est en accès libre."
                : "Nous ne pouvons pas afficher la grille en ce moment. Plutôt que de risquer un prix périmé, nous préférons ne rien afficher — réessayez dans un instant."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Créer un compte
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Nous écrire
            </Link>
          </CardContent>
        </Card>
      )}

      <section
        aria-labelledby="titre-conditions"
        className="mt-16 max-w-3xl space-y-3 border-t border-border pt-8"
      >
        <h2
          id="titre-conditions"
          className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          Bon à savoir
        </h2>
        <ul className="list-disc space-y-1.5 pl-6 text-muted-foreground">
          <li>
            Le paiement s&apos;effectue par <strong className="font-medium text-foreground">mobile
            money</strong> — MTN Mobile Money et Orange Money.
          </li>
          <li>
            Le nombre de corrections annoncé est un{" "}
            <strong className="font-medium text-foreground">ordre de grandeur</strong> : une
            correction orale consomme davantage qu&apos;une correction écrite.
          </li>
          <li>
            L&apos;équivalent en euros est donné à titre indicatif, à la parité fixe
            1 € = {XAF_PAR_EUR.toLocaleString("fr-FR")} FCFA. La{" "}
            <strong className="font-medium text-foreground">facturation se fait en FCFA</strong>.
          </li>
          <li>
            Le prix applicable est celui affiché au moment de la commande — voir les{" "}
            <Link href="/cgv" className="underline underline-offset-4">
              Conditions Générales de Vente
            </Link>
            .
          </li>
        </ul>
      </section>
    </div>
  );
}
