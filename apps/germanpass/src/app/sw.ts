/// <reference lib="webworker" />
/**
 * Service Worker (Serwist) — offline-first pour GermanPass.
 *
 * Stratégies :
 *  - /api/auth/*           → NetworkOnly (JAMAIS mis en cache — risque de boucle NextAuth)
 *  - /api/learn/flashcards/due → NetworkFirst (fallback cache si offline)
 *  - /api/learn/lessons/*  → StaleWhileRevalidate (lecture rapide, MAJ en arrière-plan)
 *  - /api/learn/courses    → StaleWhileRevalidate
 *  - Soumissions POST      → BackgroundSyncQueue (rejoué au retour du réseau)
 *  - Tout le reste         → defaultCache (Serwist)
 */
import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  BackgroundSyncQueue,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// ─── Stratégies ────────────────────────────────────────────────────────────

const networkOnly = new NetworkOnly();

const networkFirstFlashcards = new NetworkFirst({
  cacheName: "flashcards-due-v1",
  networkTimeoutSeconds: 5,
  plugins: [],
});

const staleWhileRevalidateLessons = new StaleWhileRevalidate({
  cacheName: "lessons-v1",
});

// ─── File de soumissions hors-ligne ────────────────────────────────────────

const submitQueue = new BackgroundSyncQueue("daf-submit-queue", {
  maxRetentionTime: 24 * 60, // 24 h en minutes
});

// ─── Serwist (précaching + runtime caching) ────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 1. Auth : réseau uniquement, sans cache
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/auth/"),
      handler: networkOnly,
    },
    // 1b. État utilisateur mutable (profil, niveau débloqué, progression) :
    //     JAMAIS en cache → évite d'afficher un niveau périmé d'un appareil à l'autre.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/account/") ||
        url.pathname === "/api/progress" ||
        url.pathname === "/api/learn/recommendations",
      handler: networkOnly,
    },
    // 2. Flashcards dues : NetworkFirst (5 s timeout → fallback cache)
    {
      matcher: ({ url }) => url.pathname === "/api/learn/flashcards/due",
      handler: networkFirstFlashcards,
    },
    // 3. Leçons & cours : StaleWhileRevalidate
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/learn/lessons/") ||
        url.pathname.startsWith("/api/learn/courses"),
      handler: staleWhileRevalidateLessons,
    },
    // 4. Stratégies par défaut Serwist pour tout le reste
    ...defaultCache,
  ],
});

// ─── Interception des soumissions POST pour BackgroundSync ─────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Exclure absolument les routes auth
  if (url.pathname.startsWith("/api/auth/")) return;

  const isOfflineSubmission =
    request.method === "POST" &&
    (url.pathname.includes("/api/learn/flashcards/") ||
      url.pathname.includes("/api/learn/lessons/") ||
      url.pathname.includes("/api/practice/attempts/"));

  if (!isOfflineSubmission) return;

  event.respondWith(
    (async () => {
      try {
        return await fetch(request.clone());
      } catch {
        await submitQueue.pushRequest({ request });
        return Response.json(
          {
            ok: false,
            queued: true,
            message: "Hors-ligne : soumission mise en file d'attente",
          },
          { status: 202 }
        );
      }
    })()
  );
});

serwist.addEventListeners();
