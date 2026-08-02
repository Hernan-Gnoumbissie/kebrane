import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OFFERS, getPaymentMethods, ACTIVATION_STEPS } from "@/lib/pricing";

export const metadata = { title: "Tarifs & paiement" };

const XAF = new Intl.NumberFormat("fr-FR");

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; activation?: string }>;
}) {
  const params = await searchParams;
  const paymentMethods = getPaymentMethods();

  return (
    <main className="container max-w-4xl space-y-8 py-10">
      {params.registered ? (
        <p role="status" className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          ✅ Votre compte a été créé. Dernière étape : choisissez une formule, effectuez le
          paiement, puis envoyez votre preuve — votre accès sera activé par un administrateur.
        </p>
      ) : null}
      {params.activation ? (
        <p role="status" className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
          ⏳ Votre compte est en attente d&apos;activation. Votre espace de travail sera
          accessible dès qu&apos;un administrateur aura validé votre preuve de paiement.
        </p>
      ) : null}

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Tarifs &amp; activation du compte</h1>
        <p className="text-muted-foreground">
          L&apos;accès est débloqué pour la durée payée, sans renouvellement automatique.
          Préparation Goethe · ÖSD · telc · ECL, niveaux A1 → C2.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OFFERS.map((o) => (
          <Card key={o.days} className={o.highlight ? "border-primary shadow-md" : undefined}>
            <CardHeader>
              <CardTitle className="text-base">{o.name}</CardTitle>
              <CardDescription>{o.days} jours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold">
                {XAF.format(o.priceXaf)} <span className="text-sm font-normal">FCFA</span>
              </p>
              <p className="text-sm text-muted-foreground">{o.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comment activer votre compte ?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {ACTIVATION_STEPS.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modes de paiement</CardTitle>
          <CardDescription>
            Mentionnez votre adresse e-mail d&apos;inscription en référence du paiement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Les coordonnées de paiement seront communiquées prochainement — contactez-nous en
              attendant.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {paymentMethods.map((m) => (
                <div key={m.name} className="rounded-md border p-4 text-sm">
                  <p className="font-semibold">{m.name}</p>
                  <p className="mt-1 break-all">{m.details}</p>
                  {m.note ? <p className="mt-1 text-xs text-muted-foreground">{m.note}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vous avez aussi un code promo ?</CardTitle>
          <CardDescription>
            Un code valide active immédiatement votre accès depuis « Mon compte », sans preuve de
            paiement.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/account" className={buttonVariants()}>
          Envoyer ma preuve de paiement
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "outline" })}>
          Se connecter
        </Link>
        <Link href="/legal" className={buttonVariants({ variant: "ghost" })}>
          Mentions légales &amp; RGPD
        </Link>
      </div>
    </main>
  );
}
