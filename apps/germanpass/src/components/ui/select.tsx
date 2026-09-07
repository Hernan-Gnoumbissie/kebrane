import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Liste déroulante thémée (QW-3).
 *
 * Reste un `<select>` NATIF, volontairement. Une liste réimplémentée en div
 * coûte le clavier, le lecteur d'écran, la recherche par frappe et surtout le
 * sélecteur en roue des téléphones — or une bonne part des apprenants passe par
 * mobile. On habille donc le natif au lieu de le remplacer : le chevron est
 * dessiné par-dessus et la flèche du système est masquée (`appearance-none`).
 *
 * Hauteur 44 px (`h-11`) : c'est la cible tactile minimale recommandée, et
 * c'est ce que QW-3 exige pour les contrôles où l'apprenant passe son temps.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex w-full">
      <select
        ref={ref}
        className={cn(
          "h-11 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
);
Select.displayName = "Select";

export { Select };
