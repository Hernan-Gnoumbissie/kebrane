import Link from "next/link";

/**
 * Rappel légal compact (KB-33) pour les parcours où le pied de page complet
 * n'a pas sa place : inscription, connexion, et plus tard le paiement.
 *
 * Ce n'est PAS un recueil de consentement — celui-ci est assuré par la
 * « Legal acceptance » de Clerk à l'inscription (KB-27). Ici on garantit
 * seulement que les documents restent atteignables sans quitter le parcours.
 */
const LIENS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/cgu", label: "CGU" },
  { href: "/cgv", label: "CGV" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
];

export function LegalLinksInline({ className }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LIENS.map((lien) => (
          <li key={lien.href}>
            <Link href={lien.href} className="underline-offset-4 hover:text-foreground hover:underline">
              {lien.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
