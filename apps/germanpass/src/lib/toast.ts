/**
 * API toast légère — basée sur CustomEvent, utilisable depuis n'importe quel
 * composant client sans Provider. Le Toaster écoute ces événements.
 *
 * Usage :
 *   import { toast } from "@/lib/toast";
 *   toast.success("Sauvegardé !");
 *   toast.error("Erreur réseau");
 *   toast("Information neutre");
 */

export type ToastVariant = "default" | "success" | "error";

export interface ToastPayload {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

const EVENT = "daf:toast";

function emit(message: string, variant: ToastVariant, durationMs = 4000) {
  if (typeof window === "undefined") return; // SSR guard
  const payload: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message,
    variant,
    durationMs,
  };
  window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
}

export const toast = Object.assign(
  (message: string, durationMs?: number) => emit(message, "default", durationMs),
  {
    success: (message: string, durationMs?: number) => emit(message, "success", durationMs),
    error: (message: string, durationMs?: number) => emit(message, "error", durationMs),
  }
);

export { EVENT as TOAST_EVENT };
