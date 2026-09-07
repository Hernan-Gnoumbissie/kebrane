import type { ReactNode } from "react";

/**
 * Section repliable regroupant des contenus par niveau (A1→C2).
 * Utilise <details>/<summary> natifs (aucun JS, accessible). Gain de place :
 * replié par défaut, sauf si `defaultOpen`.
 */
export function LevelGroup({
  level,
  count,
  defaultOpen,
  children,
}: {
  level: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-lg border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40">
        <span className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-[2rem] items-center justify-center rounded-md bg-info/15 px-1.5 text-xs font-bold text-info">
            {level}
          </span>
          <span className="text-sm text-muted-foreground">
            {count} élément{count > 1 ? "s" : ""}
          </span>
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="space-y-4 border-t p-3">{children}</div>
    </details>
  );
}

/** Sous-titre léger de regroupement par type, à l'intérieur d'un LevelGroup. */
export function SubGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium">{count}</span>
      </p>
      {children}
    </div>
  );
}
