"use client";

/**
 * Progression discrète pour les parcours multi-étapes.
 *
 * L'étape courante est indiquée en texte (« Étape 2 sur 3 ») et annoncée aux
 * lecteurs d'écran via `aria-live`. La barre segmentée est purement décorative :
 * la progression ne repose jamais sur la seule couleur.
 */
export function Stepper({
  current,
  total,
  title,
}: {
  current: number;
  total: number;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          Étape {current} sur {total}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        Étape {current} sur {total} : {title}
      </p>

      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label="Progression de l'inscription"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              i < current ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
