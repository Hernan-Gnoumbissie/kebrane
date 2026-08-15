import { UserButton } from "@clerk/nextjs";
import { checkStaff } from "@kebrane/auth/server";
import { reporting } from "@kebrane/core";
import { Card, CardHeader, CardTitle, CardDescription, KebraneLogo, cn } from "@kebrane/ui";
import { AccesRefuse } from "@/components/acces-refuse";

// Des indicateurs ne se mettent pas en cache : ils seraient faux à l'affichage.
export const dynamic = "force-dynamic";

const NOMBRE = new Intl.NumberFormat("fr-FR");

function Chiffre({
  label,
  valeur,
  precision,
  alerte,
}: {
  label: string;
  valeur: string;
  precision?: string;
  alerte?: boolean;
}) {
  return (
    <Card className={cn(alerte && "border-accent/40 bg-accent/5")}>
      <CardHeader className="space-y-1">
        <CardDescription className="uppercase tracking-[0.12em] text-xs">{label}</CardDescription>
        <CardTitle className={cn("text-3xl", alerte ? "text-accent" : "text-primary")}>
          {valeur}
        </CardTitle>
        {precision ? (
          <p className="text-sm text-muted-foreground">{precision}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export default async function AdminHome() {
  // Rôle ET double authentification, vérifiés côté serveur (KB-15).
  const { session, denial } = await checkStaff("STAFF");
  if (denial) return <AccesRefuse denial={denial} email={session?.account.email} />;

  const [stats, alertes, metriques] = await Promise.all([
    reporting.platformStats(),
    reporting.alertesRecentes(8),
    reporting.productMetrics(),
  ]);

  const revenus =
    stats.revenus.length === 0
      ? "—"
      : stats.revenus.map((r) => `${NOMBRE.format(r.total)} ${r.currency}`).join(" · ");

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-border py-5">
        <div className="flex items-center gap-3">
          <KebraneLogo />
          <span className="rounded-pill border border-border px-2.5 py-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Administration
          </span>
        </div>
        <UserButton />
      </header>

      <main className="flex-1 py-10">
        <h1 className="text-2xl font-bold text-primary">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-muted-foreground">
          Bonjour {session!.account.name} — rôle {session!.account.role.toLowerCase()}.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Chiffre label="Inscrits" valeur={NOMBRE.format(stats.inscrits)} />
          <Chiffre
            label="Abonnements actifs"
            valeur={NOMBRE.format(stats.abonnementsActifs)}
            precision="accès non échu"
          />
          <Chiffre label="Revenus encaissés" valeur={revenus} precision="paiements confirmés" />
          <Chiffre
            label="Paiements échoués"
            valeur={NOMBRE.format(stats.paiementsEchoues)}
            alerte={stats.paiementsEchoues > 0}
          />
          <Chiffre
            label="Actifs (30 j)"
            valeur={NOMBRE.format(stats.actifs30j)}
            precision={
              stats.dernierPassage
                ? `dernier passage le ${stats.dernierPassage.toLocaleDateString("fr-FR")}`
                : "aucun passage enregistré"
            }
          />
          <Chiffre
            label="Alertes au journal"
            valeur={NOMBRE.format(stats.alertes)}
            precision="gravité « action requise »"
            alerte={stats.alertes > 0}
          />
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Dernières alertes
          </h2>
          {alertes.length === 0 ? (
            <p className="text-muted-foreground">Rien à signaler.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Quand</th>
                    <th className="px-4 py-2 font-medium">Événement</th>
                  </tr>
                </thead>
                <tbody>
                  {alertes.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {a.createdAt.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-2">
                        <code>{a.type}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Indicateurs publiés par les produits
          </h2>
          {metriques.length === 0 ? (
            // Dire ce qui manque vaut mieux qu'afficher un zéro qu'on prendrait
            // pour une mesure.
            <p className="text-sm text-muted-foreground">
              Aucun indicateur publié. Ces mesures sont calculées par le produit —
              Core ne saurait pas les produire sans connaître son métier. Pour GermanPass :{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">
                pnpm --filter @kebrane/germanpass kebrane:metrics
              </code>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metriques.map((m) => (
                <Chiffre
                  key={`${m.productName}-${m.key}`}
                  label={`${m.productName} — ${m.label ?? m.key}`}
                  valeur={`${NOMBRE.format(m.value)}${m.unit ?? ""}`}
                  precision={`relevé le ${m.capturedAt.toLocaleDateString("fr-FR")}`}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
