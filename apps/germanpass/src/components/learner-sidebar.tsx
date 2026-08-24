"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  FileText,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mic,
  PenLine,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Barre latérale de l'espace apprenant (UX-07, UX-11).
 *
 * Reprend la STRUCTURE de la barre d'administration — sections titrées, une
 * icône par entrée, état actif, chevron au survol — parce que c'est elle qui la
 * rendait lisible : elle GROUPE là où l'apprenant recevait six liens à plat.
 *
 * Mais PAS sa palette. L'admin est en ardoise (`bg-slate-900`) avec un actif
 * `bg-blue-600` : deux couleurs hors charte. Ici le fond sombre est le **Marine**
 * de la charte, le texte le Papier, et le Rouge reste réservé aux compteurs
 * d'alerte. Le résultat a la même présence visuelle sans sortir du cadre.
 *
 * **Desktop uniquement** (`lg:`). Sur téléphone, une colonne fixe mangerait la
 * largeur dont les textes d'entraînement ont besoin ; le menu burger existant
 * continue d'y répondre.
 */
type Entree = { href: string; label: string; icon: React.ElementType; exact?: boolean };
type Section = { titre: string; entrees: Entree[] };

/**
 * Regroupement pensé du point de vue de l'apprenant, pas de l'arborescence :
 * on s'entraîne, puis on s'évalue, et le tableau de bord surplombe les deux.
 */
const SECTIONS: Section[] = [
  {
    titre: "Mon parcours",
    entrees: [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
      { href: "/learn", label: "Apprentissage", icon: GraduationCap },
    ],
  },
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
  {
    titre: "Mon compte",
    entrees: [{ href: "/account", label: "Paramètres", icon: UserCog }],
  },
];

function Lien({ entree }: { entree: Entree }) {
  const pathname = usePathname();
  // `exact` évite que /practice reste allumé quand on est sur
  // /practice/schreiben — deux entrées distinctes de la même section.
  const actif = entree.exact ? pathname === entree.href : pathname.startsWith(entree.href);

  return (
    <Link
      href={entree.href}
      aria-current={actif ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
        actif
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      )}
    >
      <entree.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{entree.label}</span>
      {!actif ? (
        <ChevronRight
          aria-hidden="true"
          className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40"
        />
      ) : null}
    </Link>
  );
}

export function LearnerSidebar() {
  return (
    <aside
      aria-label="Navigation de l'espace apprenant"
      className="fixed bottom-0 left-0 top-14 z-20 hidden w-60 flex-col overflow-y-auto bg-primary px-3 py-5 lg:flex"
    >
      <nav className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.titre}>
            <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground/40">
              {section.titre}
            </p>
            <div className="space-y-0.5">
              {section.entrees.map((entree) => (
                <Lien key={entree.href} entree={entree} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
