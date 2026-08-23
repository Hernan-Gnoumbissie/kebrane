import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getKebraneSession } from "@kebrane/auth/server";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@kebrane/ui";
import { SupprimerCompte } from "./supprimer-compte";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paramètres du compte",
  robots: { index: false, follow: false },
};

/**
 * Espace de paramètres du compte (KB-28).
 *
 * C'est ici que les droits annoncés par la politique de confidentialité
 * (KB-25) deviennent des boutons. L'identité elle-même (mot de passe, e-mail,
 * double authentification) reste gérée par Clerk depuis le `<UserButton>` de
 * l'en-tête : la dupliquer ici créerait deux endroits pour le même réglage.
 */
export default async function ParametresPage() {
  const session = await getKebraneSession();
  if (!session) redirect("/login");
  const { account } = session;

  return (
    <>
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mon espace</p>
      <h1 className="mt-1 text-3xl font-bold text-primary">Paramètres du compte</h1>
      <p className="mt-2 text-muted-foreground">
        Vos données, et ce que vous pouvez en faire.
      </p>

      <div className="mt-8 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Vos informations</CardTitle>
            <CardDescription>
              Nom et adresse sont gérés par votre identité de connexion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Nom</dt>
              <dd>{account.name}</dd>
              <dt className="text-muted-foreground">Adresse e-mail</dt>
              <dd>{account.email}</dd>
              <dt className="text-muted-foreground">Compte créé le</dt>
              <dd>{account.createdAt.toLocaleDateString("fr-FR")}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exporter mes données</CardTitle>
            <CardDescription>
              Télécharge un fichier JSON contenant votre compte, vos accès aux produits, vos
              paiements et votre journal d&apos;activité.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Balise `a` et non `Link` : c'est un téléchargement, pas une
                navigation — le préchargement de Next déclencherait l'export. */}
            <a
              href="/hub/parametres/export"
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Télécharger mes données
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supprimer mon compte</CardTitle>
            <CardDescription>
              Efface vos données personnelles et votre identité de connexion. Vos justificatifs de
              paiement sont conservés anonymisés, comme l&apos;impose la comptabilité — voir la{" "}
              <Link href="/confidentialite" className="underline underline-offset-4">
                Politique de confidentialité
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupprimerCompte />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
