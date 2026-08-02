"use client";

/**
 * Bannière sticky affichée quand l'utilisateur est hors-ligne
 * ou quand des révisions sont en attente de synchronisation.
 *
 * Placé juste sous la balise <body> dans le RootLayout, via OfflineProvider.
 */

import { useOffline } from "@/hooks/useOffline";

export function OfflineBanner() {
  const { isOffline, pendingCount } = useOffline();

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "sticky top-0 z-50 px-4 py-2 text-center text-sm font-medium leading-tight",
        isOffline
          ? "bg-amber-400 text-amber-950"
          : "bg-blue-600 text-white",
      ].join(" ")}
    >
      {isOffline ? (
        <>
          📡{" "}
          <span>
            Mode hors ligne — certaines fonctionnalités sont limitées
          </span>
          {pendingCount > 0 && (
            <span className="ml-2 opacity-80">
              · {pendingCount} révision{pendingCount > 1 ? "s" : ""} en attente
            </span>
          )}
        </>
      ) : pendingCount > 0 ? (
        <>
          <svg
            className="mr-1 inline-block h-3.5 w-3.5 animate-spin align-middle"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Synchronisation de {pendingCount} révision
          {pendingCount > 1 ? "s" : ""}…
        </>
      ) : null}
    </div>
  );
}
