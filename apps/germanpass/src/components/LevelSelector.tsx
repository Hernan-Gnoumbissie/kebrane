"use client";

import { Lock, MapPin, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVEL_ORDER)[number];

interface Props {
  /** Niveau actuellement débloqué par l'utilisateur (ex. "B1"). Fallback "A1" si absent. */
  currentLevel?: string | null;
  /** Niveau visé déclaré par l'utilisateur (mis en avant par une icone). */
  targetLevel?: string | null;
  /** Niveau sélectionné. */
  selected: string;
  onChange: (level: string) => void;
}

export function LevelSelector({ currentLevel, targetLevel, selected, onChange }: Props) {
  const effectiveCurrent =
    currentLevel && LEVEL_ORDER.includes(currentLevel as Level)
      ? (currentLevel as Level)
      : "A1";
  const currentIdx = LEVEL_ORDER.indexOf(effectiveCurrent);

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sélection du niveau">
      {LEVEL_ORDER.map((level) => {
        const idx = LEVEL_ORDER.indexOf(level);
        const isLocked = idx > currentIdx;
        const isSelected = level === selected;
        const isTarget = level === targetLevel;
        const isCurrent = level === effectiveCurrent;
        const prevLevel = LEVEL_ORDER[idx - 1] ?? effectiveCurrent;

        const tooltipMsg = isLocked
          ? `Niveau ${level} verrouillé — Atteins 70 % de score moyen en ${prevLevel} pour le débloquer`
          : isCurrent
          ? `Ton niveau actuel`
          : isTarget
          ? `Ton objectif déclaré`
          : level;

        return (
          <button
            key={level}
            type="button"
            disabled={isLocked}
            title={tooltipMsg}
            aria-label={tooltipMsg}
            aria-pressed={isSelected}
            onClick={() => !isLocked && onChange(level)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              isLocked && "opacity-40 cursor-not-allowed bg-muted text-muted-foreground border-transparent",
              !isLocked && isSelected && "bg-primary text-primary-foreground border-primary",
              !isLocked && !isSelected && "bg-background text-foreground border-border hover:bg-secondary",
            )}
          >
            {/* Icônes décoratives : le statut est déjà porté par `aria-label`
                (= `tooltipMsg`), donc rien n'est perdu pour un lecteur d'écran. */}
            {isLocked ? (
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            ) : isCurrent && isSelected ? (
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            ) : null}
            {level}
            {isTarget && !isLocked ? (
              <Target aria-hidden="true" className="h-3.5 w-3.5" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
