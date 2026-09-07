import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Gabarit des pages éditoriales (KB-33) : vitrine, à propos, contact, FAQ,
 * tarifs, pages produit.
 *
 * C'est ici que vit la cible du lien d'évitement (`#contenu`, KB-16) : déclarée
 * une fois dans le gabarit, elle ne peut plus manquer sur une page.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <SiteHeader />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
