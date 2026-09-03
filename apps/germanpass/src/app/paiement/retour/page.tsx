import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Paiement — vérification en cours" };

/**
 * Retour du payeur depuis PayDunya (KB-13). À ce stade le paiement est le plus
 * souvent encore EN ATTENTE : la confirmation arrive par l'IPN, de façon
 * asynchrone. On ne promet donc pas un accès déjà ouvert — on rassure et on
 * laisse l'IPN faire foi.
 */
export default function PaiementRetourPage() {
  return (
    <main className="container max-w-2xl space-y-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Merci — paiement en cours de vérification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Ton paiement a bien été initié. Il est en cours de confirmation par
            l&apos;opérateur — ton accès s&apos;ouvrira <strong>automatiquement</strong> dès
            qu&apos;il est validé, en général en quelques instants.
          </p>
          <p>
            Aucune action supplémentaire n&apos;est nécessaire. Tu peux suivre l&apos;état de
            ton accès depuis « Mon compte ».
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/account" className={buttonVariants()}>
              Mon compte
            </Link>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Mon espace de travail
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
