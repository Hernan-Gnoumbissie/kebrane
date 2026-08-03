"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/logo";
import { KEBRANE_HUB_URL } from "@/lib/platform";

type NavItem = { href: string; label: string };

interface MobileNavProps {
  nav: NavItem[];
  isAdmin: boolean;
  /** Prénom de l'utilisateur connecté (premier mot du name) */
  firstName?: string | null;
}

/** Menu hamburger mobile — composant client isolé pour garder AppHeader en server component.
 *  Utilise un portal React pour éviter les conflits sticky/fixed sur iOS Safari. */
export function MobileNav({ nav, isAdmin, firstName }: MobileNavProps) {
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname              = usePathname();

  // Montage côté client uniquement (nécessaire pour createPortal)
  useEffect(() => { setMounted(true); }, []);

  // Ferme le menu lors d'une navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  // Empêche le scroll du body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Bouton burger — min 44 × 44 px (touch target iOS) ── */}
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="md:hidden flex flex-col justify-center items-center gap-[5px] w-11 h-11 rounded-xl hover:bg-secondary active:bg-secondary/80 transition-colors shrink-0"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`block h-0.5 w-5 bg-foreground rounded-full transition-all duration-200 origin-center ${
            open ? "translate-y-[7px] rotate-45" : ""
          }`}
        />
        <span
          className={`block h-0.5 w-5 bg-foreground rounded-full transition-opacity duration-200 ${
            open ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block h-0.5 w-5 bg-foreground rounded-full transition-all duration-200 origin-center ${
            open ? "-translate-y-[7px] -rotate-45" : ""
          }`}
        />
      </button>

      {/* ── Overlay + drawer — rendu dans <body> via portal pour éviter les conflits sticky iOS ── */}
      {mounted && open &&
        createPortal(
          <>
            {/* Fond semi-transparent */}
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />

            {/* Panneau latéral droit */}
            <nav
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navigation"
              className="fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-background border-l shadow-2xl flex flex-col md:hidden"
            >
              {/* En-tête du drawer */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <Logo size="sm" />
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Bonjour [Prénom] */}
              {firstName && (
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-foreground">
                    Bonjour {firstName} 👋
                  </p>
                </div>
              )}

              {/* Liens de navigation */}
              <ul className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
                {nav.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          "flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-secondary text-foreground",
                        ].join(" ")}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Actions bas de drawer */}
              <div className="border-t p-3 flex flex-col gap-2">
                <Link
                  href="/account"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "w-full justify-start h-11",
                  })}
                >
                  Mon compte
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={buttonVariants({
                      size: "sm",
                      className: "w-full justify-start h-11",
                    })}
                  >
                    Administration
                  </Link>
                )}
                {/* Retour au hub Kebrane — session partagée, pas de re-login (KB-10). */}
                <a
                  href={KEBRANE_HUB_URL}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "w-full justify-start h-11",
                  })}
                >
                  Compte Kebrane
                </a>
                <LogoutButton />
              </div>
            </nav>
          </>,
          document.body
        )}
    </>
  );
}
