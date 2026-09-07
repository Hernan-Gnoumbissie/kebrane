import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Paiement annulé" };

/** Retour « annulé » depuis PayDunya (KB-13). Aucun débit, on propose de réessayer. */
export default function PaiementAnnulePage() {
  return (
    <main className="container max-w-2xl space-y-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Paiement annulé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Le paiement a été annulé — aucun montant n&apos;a été débité.</p>
          <p>
            Tu peux réessayer quand tu veux, ou régler par un autre moyen (Orange Money)
            en envoyant ta preuve depuis « Mon compte ».
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/pricing" className={buttonVariants()}>
              Revenir aux tarifs
            </Link>
            <Link href="/account" className={buttonVariants({ variant: "outline" })}>
              Mon compte
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
