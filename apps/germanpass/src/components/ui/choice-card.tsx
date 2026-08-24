"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Option de réponse présentée en CARTE CLIQUABLE (QW-3).
 *
 * Remplace le couple `<input type="radio">` + libellé, où seuls la pastille et
 * le texte étaient cliquables — une cible de quelques pixels, pénible au doigt
 * et particulièrement sur les listes de réponses d'un examen chronométré.
 *
 * Ce qui est délibéré ici :
 *
 *  - **L'input natif est CONSERVÉ**, simplement rendu invisible (`sr-only`).
 *    Il porte le nom, la coche, le clavier, les flèches entre radios d'un même
 *    groupe et l'annonce du lecteur d'écran. Réimplémenter tout ça en `div`
 *    avec `role="radio"` est le chemin classique vers une régression
 *    d'accessibilité silencieuse.
 *  - **Toute la carte est cliquable** parce que c'est un `<label>` : le clic
 *    est transmis à l'input sans une ligne de JavaScript.
 *  - **Hauteur minimale de 44 px** (`min-h-11`), cible tactile recommandée.
 *  - **L'état sélectionné ne repose pas sur la seule couleur** : bordure
 *    accentuée, fond teinté ET coche explicite.
 *
 * `peer-focus-visible` porte l'anneau de focus sur la carte alors que le focus
 * réel est sur l'input masqué — sans ça, la navigation au clavier se ferait à
 * l'aveugle.
 */
export function ChoiceCard({
  type,
  name,
  checked,
  disabled,
  onChange,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
        checked ? "border-primary bg-primary/5 font-medium" : "border-input hover:bg-muted/60",
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent"
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only"
      />
      {/* Indicateur dessiné : rond pour un choix unique, carré pour un choix
          multiple. La FORME dit déjà si l'on peut cocher plusieurs réponses. */}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
          type === "radio" ? "rounded-full" : "rounded",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input"
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="flex-1">{children}</span>
    </label>
  );
}
