import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getKebraneSession } from "@kebrane/auth/server";
import { access, products as coreProducts, AccessStatus, ProductStatus } from "@kebrane/core";
import type { Product, ProductAccess } from "@kebrane/core";
import {
  buttonVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  KebraneLogo,
  cn,
} from "@kebrane/ui";

export const dynamic = "force-dynamic";

/**
 * Libellé et ton de la pastille de statut d'abonnement (KB-09).
 * Charte : le Rouge reste un accent RARE — réservé au seul cas qui demande une
 * action du membre (compte suspendu). Le reste vit dans les neutres.
 */
function statusChip(status: AccessStatus | null): { label: string; className: string } {
  switch (status) {
    case AccessStatus.ACTIVE:
      return { label: "Actif", className: "border-primary/30 bg-primary/10 text-primary" };
    case AccessStatus.PENDING:
      return { label: "En attente", className: "border-border bg-muted text-muted-foreground" };
    case AccessStatus.SUSPENDED:
      return { label: "Suspendu", className: "border-accent/40 bg-accent/10 text-accent" };
    default:
      return { label: "À souscrire", className: "border-border bg-transparent text-muted-foreground" };
  }
}

function ProductCard({
  product,
  status,
}: {
  product: Product;
  status: AccessStatus | null;
}) {
  const chip = statusChip(status);
  const available = product.status === ProductStatus.ACTIVE && Boolean(product.url);
  const isActive = status === AccessStatus.ACTIVE;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{product.name}</CardTitle>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              chip.className
            )}
          >
            {chip.label}
          </span>
        </div>
        <CardDescription>{product.tagline ?? "Bientôt disponible."}</CardDescription>
      </CardHeader>
      <div className="p-6 pt-0">
        {available ? (
          <a
            href={product.url!}
            className={buttonVariants({ variant: isActive ? "primary" : "outline", size: "sm" })}
          >
            {isActive ? `Ouvrir ${product.name}` : `Découvrir ${product.name}`}
          </a>
        ) : (
          <span className={buttonVariants({ variant: "ghost", size: "sm" })}>Bientôt</span>
        )}
      </div>
    </Card>
  );
}

export default async function HubPage() {
  const session = await getKebraneSession();
  if (!session) redirect("/login");
  const { account } = session;

  // Registre des produits + accès du compte, lus via l'interface de services.
  const [registered, accesses] = await Promise.all([
    coreProducts.list(),
    access.forAccount(account.id),
  ]);

  const statusByProductId = new Map<string, AccessStatus>(
    accesses.map((a: ProductAccess) => [a.productId, a.status])
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-border py-5">
        <KebraneLogo />
        <UserButton />
      </header>

      <main className="flex-1 py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Mon espace</p>
        <h1 className="mt-1 text-3xl font-bold text-primary">Bonjour {account.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Un compte Kebrane, tous vos produits. Rôle : {account.role.toLowerCase()}.
        </p>

        <h2 className="mb-4 mt-10 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Vos produits
        </h2>

        {registered.length === 0 ? (
          <p className="text-muted-foreground">
            Aucun produit n&apos;est encore enregistré. Lancez le seed du registre :{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              pnpm --filter @kebrane/core seed
            </code>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {registered.map((p: Product) => (
              <ProductCard
                key={p.id}
                product={p}
                status={statusByProductId.get(p.id) ?? null}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
