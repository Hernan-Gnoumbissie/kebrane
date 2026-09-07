import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tendance } from "@/lib/tendance";

/**
 * Chiffre clé, avec sa tendance (UX-07).
 *
 * Reprend l'apport réel de `AdminKpiCard` — icône, valeur, sous-titre et
 * surtout **badge de tendance** : un chiffre nu ne dit pas si l'on progresse.
 *
 * Ce qui n'est PAS repris, c'est sa palette. L'original propose cinq accents
 * (`blue` / `emerald` / `amber` / `red` / `violet`) en Tailwind brut, soit cinq
 * couleurs étrangères à la charte sur un même écran. Ici l'icône est neutre et
 * la couleur n'apparaît que sur la tendance, où elle porte une information.
 *
 * La valeur est en Georgia (`font-serif`) comme les prix de la grille
 * tarifaire : c'est le chiffre qu'on vient lire, il mérite la police de titre.
 */
export function StatCard({
  icone: Icone,
  label,
  valeur,
  precision,
  tendance,
  className,
}: {
  icone: React.ElementType;
  label: string;
  valeur: string | number;
  precision?: string;
  tendance?: Tendance | null;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icone aria-hidden="true" className="h-[18px] w-[18px] text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-serif text-2xl font-bold leading-tight text-primary">{valeur}</p>
          {precision ? <p className="mt-0.5 text-xs text-muted-foreground">{precision}</p> : null}
          {tendance ? <BadgeTendance tendance={tendance} /> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Le sens de la variation est porté par l'ICÔNE ET le signe, pas par la seule
 * couleur — même règle que partout ailleurs depuis QW-1.
 *
 * Un plateau n'est pas un échec : il s'affiche « stable », en gris, sans flèche
 * orientée. Colorer un zéro en rouge pousserait à interpréter une absence de
 * variation comme une mauvaise nouvelle.
 */
function BadgeTendance({ tendance }: { tendance: Tendance }) {
  const { delta, fenetre } = tendance;
  const surLes = `sur ${fenetre} session${fenetre > 1 ? "s" : ""}`;

  if (delta === 0) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus aria-hidden="true" className="h-3 w-3" />
        stable {surLes}
      </span>
    );
  }

  const enHausse = delta > 0;
  const Fleche = enHausse ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-xs font-medium",
        enHausse ? "text-success" : "text-warning"
      )}
    >
      <Fleche aria-hidden="true" className="h-3 w-3" />
      {enHausse ? "+" : ""}
      {delta} pts {surLes}
    </span>
  );
}
