"use client";

import { useEffect, useState } from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  UserCog,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

/**
 * Barre latérale de l'espace apprenant (UX-07, UX-11).
 *
 * Reprend la STRUCTURE de la barre d'administration — sections titrées, une
 * icône par entrée, état actif — parce que c'est elle qui la rendait lisible :
 * elle GROUPE là où l'apprenant recevait six liens à plat. Mais pas sa palette :
 * l'admin est en ardoise avec un actif bleu, deux couleurs hors charte. Ici le
 * fond est le Marine, le texte le Papier.
 *
 * **Repliable**, et l'état est mémorisé : chaque route de la zone connectée a
 * son propre layout, donc le composant est remonté à chaque navigation. Sans
 * `localStorage`, la barre se rouvrirait à chaque clic — le plus sûr moyen de
 * rendre le bouton inutile.
 *
 * Elle enveloppe le contenu (`children`) parce que le décalage de la zone
 * principale doit suivre la largeur de la colonne. Passer l'état par un
 * contexte aurait demandé un fournisseur de plus pour la même chose.
 */
type Entree = { href: string; label: string; icon: React.ElementType; exact?: boolean };
type Section = { titre: string; entrees: Entree[] };

/** Regroupement pensé du point de vue de l'apprenant, pas de l'arborescence. */
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

const CLE_STOCKAGE = "gp:barre-laterale-ouverte";

function Lien({ entree, ouverte }: { entree: Entree; ouverte: boolean }) {
  const pathname = usePathname();
  // `exact` évite que /practice reste allumé sur /practice/schreiben.
  const actif = entree.exact ? pathname === entree.href : pathname.startsWith(entree.href);

  return (
    <Link
      href={entree.href}
      aria-current={actif ? "page" : undefined}
      // Repliée, l'icône seule ne dit pas où elle mène : l'infobulle native
      // prend le relais, et `aria-label` garde le nom pour les lecteurs d'écran.
      title={ouverte ? undefined : entree.label}
      aria-label={ouverte ? undefined : entree.label}
      className={cn(
        "group flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
        ouverte ? "gap-3 px-3" : "justify-center px-0",
        actif
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      )}
    >
      <entree.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      {ouverte ? (
        <>
          <span className="flex-1">{entree.label}</span>
          {!actif ? (
            <ChevronRight
              aria-hidden="true"
              className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-40"
            />
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

export function LearnerSidebar({ children }: { children: React.ReactNode }) {
  // Ouverte par défaut, puis alignée sur la préférence mémorisée. Lire le
  // stockage dans un effet plutôt qu'à l'initialisation évite que le serveur et
  // le client rendent deux largeurs différentes.
  const [ouverte, setOuverte] = useState(true);

  useEffect(() => {
    const memorise = window.localStorage.getItem(CLE_STOCKAGE);
    if (memorise !== null) setOuverte(memorise === "1");
  }, []);

  function basculer() {
    setOuverte((precedent) => {
      window.localStorage.setItem(CLE_STOCKAGE, precedent ? "0" : "1");
      return !precedent;
    });
  }

  return (
    <>
      <aside
        aria-label="Navigation de l'espace apprenant"
        className={cn(
          "fixed bottom-0 left-0 top-14 z-20 hidden flex-col bg-primary transition-[width] lg:flex",
          ouverte ? "w-60" : "w-16"
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-5">
            {SECTIONS.map((section) => (
              <div key={section.titre}>
                {/* Repliée, le titre de section disparaît mais l'espacement
                    reste : les groupes restent perceptibles sans texte. */}
                {ouverte ? (
                  <p className="px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground/40">
                    {section.titre}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {section.entrees.map((entree) => (
                    <Lien key={entree.href} entree={entree} ouverte={ouverte} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Pied : déconnexion et bascule. La déconnexion vit ici plutôt que
            dans l'en-tête — c'est une action de navigation, pas une action de
            page, et l'en-tête la mettait au premier plan alors qu'elle est
            rare. */}
        <div className="border-t border-primary-foreground/10 px-3 py-3">
          <LogoutButton compact={!ouverte} surFondSombre />
          <button
            type="button"
            onClick={basculer}
            aria-expanded={ouverte}
            aria-label={ouverte ? "Replier la navigation" : "Déplier la navigation"}
            title={ouverte ? "Replier la navigation" : "Déplier la navigation"}
            className={cn(
              "mt-1 flex w-full items-center rounded-lg py-2 text-sm text-primary-foreground/60 transition-colors",
              "hover:bg-primary-foreground/10 hover:text-primary-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/70",
              ouverte ? "gap-3 px-3" : "justify-center px-0"
            )}
          >
            {ouverte ? (
              <PanelLeftClose aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
            )}
            {ouverte ? <span>Replier</span> : null}
          </button>
        </div>
      </aside>

      <div className={cn("transition-[padding]", ouverte ? "lg:pl-60" : "lg:pl-16")}>{children}</div>
    </>
  );
}
