import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { KebraneLogo } from "@kebrane/ui";
import { SiteFooter } from "@/components/site-footer";

/**
 * Gabarit de l'espace connecté.
 *
 * Extrait de `hub/page.tsx` quand la page des paramètres est arrivée (KB-28) :
 * deux pages qui recopient le même en-tête finissent toujours par diverger.
 * Le pied de page complet y figure aussi — les documents légaux doivent rester
 * à un clic depuis la zone connectée comme depuis la vitrine (KB-33).
 */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between border-b border-border py-5">
        <Link href="/hub" aria-label="Mon espace Kebrane" className="rounded-md">
          <KebraneLogo />
        </Link>
        <UserButton />
      </header>

      <main id="contenu" className="flex-1 py-10">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
