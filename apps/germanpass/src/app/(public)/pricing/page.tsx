import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOffers, getPaymentMethods, ACTIVATION_STEPS } from "@/lib/pricing";
import { startMomoCheckout } from "./checkout-actions";
import { momoAvailable as isMomoAvailable } from "@/lib/payments";

// Le catalogue vit en base (KB-13) : la page ne peut pas être figée au build.
export const dynamic = "force-dynamic";

export const metadata = { title: "Tarifs & paiement" };

const XAF = new Intl.NumberFormat("fr-FR");

// CTA principal (offre recommandée) : accent Rouge #A5322C — RARE (≤5 % de la
// surface). C'est le SEUL bouton plein rouge de la page : il capte l'œil vers
// l'action que l'on veut voir choisie. Les autres offres restent en second plan
// (contour), pour créer une hiérarchie claire plutôt que quatre boutons égaux.
const CTA_RECO =
  "inline-flex h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; activation?: string }>;
}) {
  const params = await searchParams;
  const paymentMethods = getPaymentMethods();
  // Catalogue Core, avec repli sur la grille locale si la base ne répond pas.
  const { offers } = await getOffers();
  // Le bouton de paiement automatique n'apparait que si un PSP est configure.
  const momoAvailable = await isMomoAvailable();

  return (
    <>
      <PublicHeader />
      <main className="container max-w-5xl space-y-8 py-10">
      {params.registered ? (
        <p role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          ✅ Votre compte a été créé. Dernière étape : choisissez une formule et réglez —
          votre accès s&apos;ouvre automatiquement après paiement.
        </p>
      ) : null}
      {params.activation ? (
        <p role="status" className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          ⏳ Votre compte est en attente d&apos;activation. Votre espace sera accessible dès
          la validation de votre preuve de paiement.
        </p>
      ) : null}

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Débloquez la correction de vos écrits &amp; oraux
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Payez une fois, accédez pour la durée choisie — sans renouvellement automatique.
          Goethe · ÖSD · telc · ECL, du A1 au C2.
        </p>
      </div>

      {/* Ce qui est libre — annoncé AVANT les tarifs. Le modèle freemium ne se
          comprend que si l'on voit d'abord ce qu'on obtient sans payer. */}
      <Card className="border-ciel/40 bg-ciel/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Déjà gratuit, sans limite de temps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            <li>✓ Tous les cours, du A1 au C2</li>
            <li>✓ Les examens blancs, en illimité</li>
            <li>✓ Votre progression et vos statistiques</li>
            <li>✓ <strong>Une correction écrite offerte</strong>, complète</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Les formules ci-dessous débloquent une seule chose : la{" "}
            <strong>correction automatique</strong> de vos productions écrites et orales.
          </p>
        </CardContent>
      </Card>

      <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {offers.map((o) => {
          const featured = Boolean(o.highlight);
          return (
            <Card
              key={o.days}
              className={`relative flex h-full flex-col ${
                featured
                  ? "border-primary/70 bg-ciel/15 shadow-lg sm:-translate-y-1"
                  : "border-border"
              }`}
            >
              {featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow-sm">
                  ★ Recommandé
                </span>
              ) : null}

              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-base">{o.name}</CardTitle>
                <CardDescription>{o.days} jours d&apos;accès</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3">
                <p
                  className={`font-bold tracking-tight ${featured ? "text-3xl" : "text-2xl"}`}
                >
                  {XAF.format(o.priceXaf)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">FCFA</span>
                </p>

                {o.corrections ? (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ciel/30 px-2.5 py-1 text-xs font-semibold text-primary">
                    ✓ ~{o.corrections} corrections incluses
                  </span>
                ) : null}

                <p className="text-sm text-muted-foreground">{o.description}</p>

                {momoAvailable && o.slug ? (
                  <form action={startMomoCheckout} className="mt-auto pt-4">
                    <input type="hidden" name="planSlug" value={o.slug} />
                    <button
                      type="submit"
                      aria-label={`Payer la formule ${o.name}, ${XAF.format(o.priceXaf)} FCFA, par Mobile Money`}
                      className={featured ? CTA_RECO : `${buttonVariants({ variant: "outline" })} w-full`}
                    >
                      Payer {XAF.format(o.priceXaf)} FCFA
                    </button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {momoAvailable ? (
        <p className="text-center text-sm text-muted-foreground">
          Paiement <strong>MTN Mobile Money</strong> : accès ouvert automatiquement après
          confirmation. <strong>Orange Money</strong> : réglez via les coordonnées ci-dessous
          et envoyez votre preuve.
        </p>
      ) : null}

      {/* Contenu SECONDAIRE replié : l'utilisateur qui sait quoi faire n'a rien à
          lire ; celui qui a une question l'ouvre. Moins de lecture, même service. */}
      <details className="group rounded-lg border bg-muted/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
          <span>Comment ça marche, autres moyens de paiement &amp; code promo</span>
          <span className="text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>

        <div className="space-y-6 border-t px-4 py-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Activer votre compte, étape par étape</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {ACTIVATION_STEPS.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Modes de paiement</h3>
            <p className="text-xs text-muted-foreground">
              Mentionnez votre adresse e-mail d&apos;inscription en référence du paiement.
            </p>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Les coordonnées de paiement seront communiquées prochainement.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {paymentMethods.map((m) => (
                  <div key={m.name} className="rounded-md border bg-background p-3 text-sm">
                    <p className="font-semibold">{m.name}</p>
                    <p className="mt-1 break-all">{m.details}</p>
                    {m.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-1">
            <h3 className="text-sm font-semibold">Vous avez un code promo ?</h3>
            <p className="text-sm text-muted-foreground">
              Un code valide active immédiatement votre accès depuis « Mon compte », sans
              preuve de paiement.
            </p>
          </section>
        </div>
      </details>

      <div className="flex flex-wrap justify-center gap-2">
        <Link href="/account" className={buttonVariants({ variant: "ghost" })}>
          Payer autrement (envoyer une preuve)
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Se connecter
        </Link>
        <Link href="/legal" className={buttonVariants({ variant: "ghost" })}>
          Mentions légales &amp; RGPD
        </Link>
      </div>
      </main>
    </>
  );
}
