import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Gabarit des pages légales (KB-33).
 *
 * Même en-tête et même pied de page que la vitrine — un document légal n'est
 * pas un autre site —, mais une colonne de texte plus étroite : ces pages se
 * LISENT, et une ligne de 90 caractères ne se lit pas.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      <SiteHeader />
      <main id="contenu" className="flex-1 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
