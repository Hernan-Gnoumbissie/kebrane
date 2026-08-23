import Link from "next/link";
import { KebraneLogo } from "@kebrane/ui";
import { LegalLinksInline } from "@/components/legal-links-inline";

/**
 * Gabarit des écrans d'authentification.
 *
 * Le pied de page complet encombrerait un parcours qui doit tenir en un écran ;
 * les liens légaux, eux, restent obligatoires (KB-33) — d'où la version
 * compacte. Le retour au site évite le cul-de-sac pour qui s'est trompé de
 * bouton.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4">
      <header className="py-6">
        <Link href="/" aria-label="Accueil Kebrane" className="rounded-md">
          <KebraneLogo />
        </Link>
      </header>

      <main id="contenu" className="flex w-full flex-1 items-center justify-center py-4">
        {children}
      </main>

      <LegalLinksInline className="py-6" />
    </div>
  );
}
