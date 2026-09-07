import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { buttonVariants, KebraneLogo } from "@kebrane/ui";

/**
 * En-tête de la vitrine (KB-33).
 *
 * Monté par les layouts `(marketing)` et `(legal)` : la navigation ne dépend
 * plus de la page où l'on se trouve. Un visiteur arrivé directement sur les
 * CGU par un lien externe doit pouvoir remonter au site — sans ça, une page
 * légale est un cul-de-sac.
 *
 * La navigation reste courte à dessein : trois destinations, pas un menu.
 *
 * **Mobile** : ces trois liens passent sur une SECONDE LIGNE, ils ne
 * disparaissent pas. Ils étaient auparavant masqués sous `sm:` sans rien pour
 * les remplacer — sur téléphone, Tarifs, FAQ et À propos devenaient
 * inatteignables depuis l'en-tête, et il fallait descendre jusqu'au pied de
 * page pour les retrouver. Trois liens tiennent sur une ligne : c'est moins
 * cher qu'un menu déroulant, et ça ne demande pas une seule ligne de
 * JavaScript.
 */
const NAVIGATION = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
  { href: "/a-propos", label: "À propos" },
];

export async function SiteHeader() {
  const { userId } = await auth();

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 py-5 sm:gap-x-4">
      <Link href="/" aria-label="Accueil Kebrane" className="mr-auto rounded-md">
        <KebraneLogo />
      </Link>

      {/* `order-last w-full` en mobile : la nav se replie sous le logo au lieu
          d'être masquée. `sm:` la remet sur la ligne, avant les actions. */}
      <nav
        aria-label="Navigation principale"
        className="order-last flex w-full items-center gap-1 border-t border-border pt-2 sm:order-none sm:w-auto sm:border-0 sm:pt-0"
      >
        {NAVIGATION.map((lien) => (
          <Link
            key={lien.href}
            href={lien.href}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {lien.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-1 sm:gap-3">
        {userId ? (
          <>
            <Link href="/hub" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Mon espace
            </Link>
            <UserButton />
          </>
        ) : (
          <>
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Se connecter
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Créer un compte
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
