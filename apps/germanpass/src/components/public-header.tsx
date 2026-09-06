import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";

/**
 * En-tête des pages PUBLIQUES (non connectées) : tarifs, mentions légales…
 *
 * Reprend à l'identique l'en-tête de la landing pour une navigation cohérente
 * et un retour à l'accueil depuis n'importe quelle page publique — ces pages
 * n'ont pas de shell connecté (`AppHeader`), elles se retrouvaient donc sans
 * aucune barre de navigation. Volontairement SANS session (aucun appel
 * `auth()`) : le contenu est public, on ne paie pas le coût d'une lecture BDD.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" aria-label="GermanPass — accueil">
          <Logo size="md" />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Tarifs
          </Link>
          <a
            href="/#contact"
            className={buttonVariants({ variant: "ghost", size: "sm" }) + " hidden sm:inline-flex"}
          >
            Contact
          </a>
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Connexion
          </Link>
          <Link href="/register" className={buttonVariants({ size: "sm" })}>
            Créer un compte
          </Link>
        </nav>
      </div>
    </header>
  );
}
