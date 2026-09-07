import type { ReactNode } from "react";
import { cn } from "@kebrane/ui";

/**
 * Mise en page commune des documents légaux (KB-22 → KB-26).
 *
 * Les textes viennent mot pour mot de `docs/content/*.md` (KB-32). Ils sont
 * transcrits en JSX plutôt que rendus depuis le Markdown : une page légale doit
 * être versionnée avec le code qui l'affiche, relisible en diff, et ne rien
 * devoir à un moteur de rendu tiers.
 *
 * Le style du corps est porté par des variantes d'attribut sur le conteneur, et
 * non par une classe répétée sur chaque paragraphe — sinon un oubli suffit à
 * faire dérailler un document de trente sections.
 */
export function LegalDocument({
  titre,
  miseAJour,
  incomplet = false,
  children,
}: {
  titre: string;
  /** Ligne « Dernière mise à jour / Date d'effet », telle qu'elle est rédigée. */
  miseAJour: ReactNode;
  /** Le document contient-il encore des marqueurs `[À COMPLÉTER]` ? */
  incomplet?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "space-y-8",
        "[&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&_li]:leading-relaxed [&_li]:text-muted-foreground",
        "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6",
        "[&_strong]:font-medium [&_strong]:text-foreground",
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4"
      )}
    >
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-tight text-primary md:text-4xl">
          {titre}
        </h1>
        <p className="text-sm italic">{miseAJour}</p>
      </header>

      {incomplet ? <DocumentIncomplet /> : null}

      {children}
    </article>
  );
}

/**
 * Avertissement de tête des documents encore incomplets.
 *
 * En Sable et non en Rouge : le Rouge de la charte est un accent RARE (≤ 5 %),
 * et il resterait allumé sur cinq pages tant que le PO n'a pas rempli les
 * marqueurs. Ce n'est pas une alerte, c'est un état connu.
 */
function DocumentIncomplet() {
  return (
    <p className="rounded-lg border border-dashed border-sable-foreground/30 bg-sable/40 px-4 py-3 text-sm !text-sable-foreground">
      Ce document comporte encore des mentions à compléter, signalées ci-dessous.
      Elles seront renseignées avant la mise en service commerciale.
    </p>
  );
}

/** Section numérotée ou titrée d'un document légal. */
export function LegalSection({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-semibold text-primary">{titre}</h2>
      {children}
    </section>
  );
}

/**
 * Marqueur `[À COMPLÉTER]` laissé VISIBLE en ligne (consigne KB-32).
 *
 * On n'invente pas une adresse d'éditeur ni une politique de remboursement
 * pour faire propre : un texte légal inventé est pire qu'un trou déclaré. Le
 * marqueur reste donc lisible par le visiteur comme par le PO.
 */
export function ACompleter({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-dashed border-sable-foreground/40 bg-sable/50 px-1.5 py-0.5 text-sable-foreground">
      [À COMPLÉTER : {children}]
    </span>
  );
}
