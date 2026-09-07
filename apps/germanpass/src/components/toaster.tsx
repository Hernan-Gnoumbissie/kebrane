"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastPayload } from "@/lib/toast";

const VARIANTS = {
  default: "bg-foreground text-background",
  success: "bg-success text-success-foreground",
  error: "bg-destructive text-destructive-foreground",
};

/** Rendu côté client — à placer une seule fois dans le RootLayout. */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const payload = (e as CustomEvent<ToastPayload>).detail;
      setToasts((prev) => [...prev, payload]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== payload.id));
      }, payload.durationMs);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg
            max-w-sm w-full pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-2
            ${VARIANTS[t.variant]}`}
        >
          {t.variant === "success" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {t.variant === "error" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
