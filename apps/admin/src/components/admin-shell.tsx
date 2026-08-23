import Link from "next/link";
import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { KebraneLogo, cn } from "@kebrane/ui";

/**
 * Chrome commun de la console d'administration.
 *
 * Extrait quand l'écran des offres est arrivé (KB-34) : l'en-tête vivait en dur
 * dans la page d'accueil, et le recopier aurait garanti la divergence à la
 * troisième page.
 */
const NAVIGATION = [
  { href: "/", label: "Vue d'ensemble", cle: "accueil" },
  { href: "/offres", label: "Offres", cle: "offres" },
] as const;

export function AdminShell({
  actif,
  children,
}: {
  actif: (typeof NAVIGATION)[number]["cle"];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
        <div className="flex items-center gap-3">
          <KebraneLogo />
          <span className="rounded-pill border border-border px-2.5 py-0.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Administration
          </span>
        </div>

        <div className="flex items-center gap-3">
          <nav aria-label="Sections de l'administration" className="flex items-center gap-1">
            {NAVIGATION.map((lien) => (
              <Link
                key={lien.cle}
                href={lien.href}
                aria-current={lien.cle === actif ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                  lien.cle === actif ? "font-medium text-primary" : "text-muted-foreground"
                )}
              >
                {lien.label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </div>
      </header>

      <main id="contenu" className="flex-1 py-10">
        {children}
      </main>
    </div>
  );
}
