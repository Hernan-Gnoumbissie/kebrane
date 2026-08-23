import Link from "next/link";
import { ByKebrane } from "@kebrane/ui";

/**
 * Pied de page de la maison (KB-33).
 *
 * Une seule définition des liens, montée par les layouts `(marketing)` et
 * `(legal)` ainsi que par le hub : c'est la condition pour que « toute page
 * donne accès aux pages légales en ≤ 1 clic » reste vrai quand on ajoute une
 * page. Un footer recopié page par page dérive à la première nouveauté.
 *
 * Les deux colonnes disent deux choses différentes : **Légal** est ce que la
 * loi exige qu'on puisse trouver, **Kebrane** ce que le visiteur cherche.
 */
const COLONNES: { titre: string; liens: { href: string; label: string }[] }[] = [
  {
    titre: "Légal",
    liens: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/cgu", label: "CGU" },
      { href: "/cgv", label: "CGV" },
      { href: "/confidentialite", label: "Confidentialité" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
  {
    titre: "Kebrane",
    liens: [
      { href: "/a-propos", label: "À propos" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
      { href: "/tarifs", label: "Tarifs" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-10 text-sm">
      <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="space-y-2">
          <ByKebrane />
          <p className="max-w-xs text-muted-foreground">
            Un compte Kebrane, tous les produits.
          </p>
        </div>

        <nav aria-label="Pied de page" className="grid grid-cols-2 gap-10 sm:gap-16">
          {COLONNES.map((colonne) => (
            <div key={colonne.titre}>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {colonne.titre}
              </h2>
              <ul className="space-y-2">
                {colonne.liens.map((lien) => (
                  <li key={lien.href}>
                    <Link
                      href={lien.href}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {lien.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <p className="mt-10 border-t border-border pt-6 text-muted-foreground">
        © {new Date().getFullYear()} Kebrane
      </p>
    </footer>
  );
}
