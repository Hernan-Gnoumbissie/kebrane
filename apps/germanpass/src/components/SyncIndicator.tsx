"use client";

/**
 * Badge compact affiché quand des révisions sont en attente de synchronisation.
 * Peut être placé dans le header ou à côté d'un bouton de révision.
 */

import { useOffline } from "@/hooks/useOffline";

export function SyncIndicator() {
  const { pendingCount } = useOffline();
  if (pendingCount === 0) return null;

  return (
    <span
      title={`${pendingCount} révision${pendingCount > 1 ? "s" : ""} en attente de synchronisation`}
      className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning"
    >
      <svg
        className="h-3 w-3 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      {pendingCount} en attente
    </span>
  );
}
