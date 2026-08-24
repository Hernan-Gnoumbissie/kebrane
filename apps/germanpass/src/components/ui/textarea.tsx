import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Zone de saisie longue thémée (QW-3).
 *
 * Mêmes bordure, rayon et anneau de focus que `Input` : sur les écrans
 * Schreiben, le champ de rédaction est l'élément avec lequel l'apprenant passe
 * le plus de temps, et il détonnait d'être le seul contrôle non thémé.
 *
 * `resize-y` seulement : le redimensionnement horizontal casse la mise en page
 * et n'apporte rien sur un texte au fil de l'eau.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed",
      "ring-offset-background placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
