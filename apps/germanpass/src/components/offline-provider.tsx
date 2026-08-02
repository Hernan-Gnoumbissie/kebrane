"use client";

/**
 * OfflineProvider + useOffline hook.
 *
 * Le Provider :
 *  - Écoute les événements online/offline du navigateur
 *  - Déclenche la synchronisation des révisions en attente dès le retour du réseau
 *  - Expose isOffline + pendingCount à tous les composants enfants
 *
 * Usage :
 *   <OfflineProvider>{children}</OfflineProvider>
 *   const { isOffline, pendingCount, refreshPendingCount } = useOffline();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { syncPendingReviews } from "@/lib/sync";
import { getPendingReviewCount } from "@/lib/offline-db";

// ─── Context ──────────────────────────────────────────────────────────────

type OfflineCtx = {
  isOffline: boolean;
  pendingCount: number;
  refreshPendingCount: () => void;
};

const OfflineContext = createContext<OfflineCtx>({
  isOffline: false,
  pendingCount: 0,
  refreshPendingCount: () => undefined,
});

// ─── Provider ─────────────────────────────────────────────────────────────

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(() => {
    void getPendingReviewCount()
      .then(setPendingCount)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // Initialisation côté client
    setIsOffline(!navigator.onLine);
    refreshPendingCount();

    function handleOnline() {
      setIsOffline(false);
      // Sync automatique + toast
      void syncPendingReviews().then(() => refreshPendingCount());
    }

    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount]);

  return (
    <OfflineContext.Provider value={{ isOffline, pendingCount, refreshPendingCount }}>
      {children}
    </OfflineContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/** Accès au contexte offline depuis n'importe quel composant enfant du Provider. */
export function useOffline(): OfflineCtx {
  return useContext(OfflineContext);
}
