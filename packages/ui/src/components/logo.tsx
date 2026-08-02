import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Marque Kebrane — charte v1.1.
 * Symbole = « le A ouvert » (source : kebrane-symbol-navy.svg / _symbol_path.txt).
 * Règles charte : aplat une seule couleur (Marine ou blanc réservé) ; jamais de
 * dégradé/ombre/relief ; ne pas reboucher l'arche ni remettre la barre.
 *   - "A nu" (mark) : ≥ 24 px, sur fond clair et uni.
 *   - "Pastille" : < 24 px, fond chargé/photo, icône d'app, avatar, favicon.
 */

// « A ouvert » : triangle plein + arche arrondie évidée (fill-rule evenodd).
const SYMBOL_PATH =
  "M60 8 L108 112 L12 112 Z M46 112 L46 60 Q46 42 60 42 Q74 42 74 60 L74 112 Z";

/** Symbole « A ouvert » nu. Hérite de la couleur via `currentColor` (Marine par défaut). */
export function KebraneSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Kebrane"
      className={cn("h-8 w-auto text-primary", className)}
    >
      <path d={SYMBOL_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** Pastille : A blanc réservé sur carré Marine arrondi (petites tailles / fonds chargés). */
export function KebranePastille({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Kebrane"
      className={cn("h-8 w-8", className)}
    >
      <rect width="120" height="120" rx="24" fill="#1F3352" />
      <g transform="translate(18 18) scale(0.7)">
        <path d={SYMBOL_PATH} fill="#FFFFFF" fillRule="evenodd" />
      </g>
    </svg>
  );
}

/** Wordmark « KEBRANE » — Georgia capitales interlettrées, Marine. */
export function KebraneWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif font-bold uppercase tracking-[0.14em] text-primary", className)}>
      Kebrane
    </span>
  );
}

/** Endorsement « By Kebrane » à apposer sur chaque produit. */
export function ByKebrane({ className }: { className?: string }) {
  return (
    <span className={cn("font-sans text-xs text-muted-foreground", className)}>
      By&nbsp;<span className="font-serif font-semibold uppercase tracking-[0.12em] text-foreground">Kebrane</span>
    </span>
  );
}

/** Logotype complet : symbole + nom (lockup). */
export function KebraneLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <KebraneSymbol className="h-7" />
      <KebraneWordmark className="text-xl" />
    </span>
  );
}
