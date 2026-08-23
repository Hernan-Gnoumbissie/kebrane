"use client";

import { scorePassword } from "@/lib/validation/auth";

const LABELS = [
  "",
  "Mot de passe faible",
  "Mot de passe correct",
  "Mot de passe robuste",
] as const;

const COLORS = ["", "bg-destructive", "bg-warning", "bg-success"] as const;

/**
 * Retour visuel non bloquant sur la robustesse du mot de passe.
 * Le score est aussi restitué en texte : la couleur seule ne porte pas
 * l'information (WCAG 1.4.1).
 */
export function PasswordMeter({ value }: { value: string }) {
  if (!value) return null;
  const score = scorePassword(value);

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i <= score ? COLORS[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {LABELS[score]}
      </p>
    </div>
  );
}
