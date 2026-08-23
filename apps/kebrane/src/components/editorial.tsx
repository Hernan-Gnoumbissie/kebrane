import type { ReactNode } from "react";
import { cn } from "@kebrane/ui";

/**
 * Mise en page commune des pages éditoriales (KB-29 → KB-31).
 *
 * Même parti pris que `legal-document.tsx` : le style du corps est porté par le
 * conteneur, pas répété paragraphe par paragraphe. La colonne est bornée à
 * `max-w-3xl` alors que le gabarit `(marketing)` va jusqu'à `5xl` — la grille
 * de cartes de la vitrine a besoin de largeur, un texte suivi n'en a pas.
 */
export function EditorialPage({
  surtitre,
  titre,
  chapeau,
  children,
}: {
  /** Petite ligne en capitales au-dessus du titre. */
  surtitre?: string;
  titre: string;
  /** Phrase d'accroche, en plus grand que le corps. */
  chapeau?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl py-12 md:py-16",
        "[&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_li]:leading-relaxed [&_li]:text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
        "[&_strong]:font-medium [&_strong]:text-foreground",
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4"
      )}
    >
      <header className="space-y-3">
        {surtitre ? (
          <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-accent" aria-hidden="true" />
            {surtitre}
          </p>
        ) : null}
        <h1 className="text-4xl font-bold leading-tight text-primary md:text-5xl">{titre}</h1>
        {chapeau ? <p className="max-w-2xl pt-1 text-lg">{chapeau}</p> : null}
      </header>

      <div className="mt-12 space-y-10">{children}</div>
    </div>
  );
}

/** Section d'une page éditoriale. */
export function EditorialSection({
  titre,
  children,
}: {
  titre: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl font-semibold text-primary">{titre}</h2>
      {children}
    </section>
  );
}
