/**
 * Navigation de l'espace apprenant — SOURCE UNIQUE (UX-11).
 *
 * Il y avait deux listes : `NAV_ITEMS` dans l'en-tête, et une liste codée en dur
 * dans la barre latérale. Résultat, le menu burger et la barre ne montraient pas
 * les mêmes destinations, et surtout la barre IGNORAIT les restrictions — un
 * compte en préparation intensive y voyait « Apprentissage », que son layout
 * bloque ensuite.
 *
 * Les deux consomment désormais cette fonction. Le regroupement suit le point de
 * vue de l'apprenant, pas l'arborescence : on s'entraîne, on s'évalue, et le
 * tableau de bord surplombe les deux.
 */
import {
  BookOpen,
  FileText,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mic,
  PenLine,
  UserCog,
} from "lucide-react";

export type EntreeNav = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Actif sur ce chemin seulement — évite que /practice s'allume sur /practice/schreiben. */
  exact?: boolean;
};

export type SectionNav = { titre: string; entrees: EntreeNav[] };

export type DroitsNav = {
  /** Formule « préparation intensive » : pas d'accès au curriculum. */
  examPrepOnly: boolean;
};

export function sectionsApprenant({ examPrepOnly }: DroitsNav): SectionNav[] {
  // Le tableau de bord figure TOUJOURS, y compris pour un administrateur.
  //
  // L'ancien en-tête le retirait de la nav des admins — « ils ont leur propre
  // espace ». La règle devient absurde dans une barre latérale : /dashboard
  // reste atteignable et sert justement de « vue candidat » à l'admin, qui s'y
  // retrouvait donc sans aucune entrée active, sur une page absente de sa
  // propre navigation.
  const parcours: EntreeNav[] = [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  ];
  if (!examPrepOnly) {
    parcours.push({ href: "/learn", label: "Apprentissage", icon: GraduationCap });
  }

  const sections: SectionNav[] = [];
  if (parcours.length > 0) sections.push({ titre: "Mon parcours", entrees: parcours });

  sections.push(
    {
      titre: "S'entraîner",
      entrees: [
        { href: "/practice", label: "Lesen / Hören", icon: Headphones, exact: true },
        { href: "/practice/schreiben", label: "Schreiben", icon: PenLine },
        { href: "/practice/sprechen", label: "Sprechen", icon: Mic },
      ],
    },
    {
      titre: "S'évaluer",
      entrees: [
        { href: "/exams", label: "Examens blancs", icon: FileText },
        { href: "/progress", label: "Ma progression", icon: BookOpen },
      ],
    },
    { titre: "Mon compte", entrees: [{ href: "/account", label: "Paramètres", icon: UserCog }] }
  );

  return sections;
}
