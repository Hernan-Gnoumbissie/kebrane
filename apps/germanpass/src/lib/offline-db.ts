/**
 * Wrapper IndexedDB pour GermanPass offline.
 *
 * Stores :
 *  - "cards"           → deck de flashcards mis en cache depuis l'API
 *  - "pending_reviews" → révisions effectuées hors-ligne, à synchroniser
 *  - "meta"            → métadonnées (ex. date du dernier cache)
 *
 * Toutes les fonctions vérifient qu'on est côté client avant d'ouvrir la DB.
 */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "germanpass-offline";
const DB_VERSION = 1;

// ─── Types ────────────────────────────────────────────────────────────────

export type OfflineCard = {
  id: string;
  front: string;
  back: string;
  article: string | null;
  plural: string | null;
  exampleDe: string;
  exampleFr: string;
  audioUrl: string | null;
  deck: { theme: string; level: string };
};

export type PendingReview = {
  /** Clé locale unique (timestamp + random) */
  id: string;
  cardId: string;
  quality: number;
  reviewedAt: string; // ISO string
};

// ─── Instance DB (singleton lazy) ─────────────────────────────────────────

let _dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB non disponible côté serveur"));
  }
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cards")) {
          db.createObjectStore("cards", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pending_reviews")) {
          db.createObjectStore("pending_reviews", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return _dbPromise;
}

// ─── Cards ────────────────────────────────────────────────────────────────

/** Sauvegarde le deck complet (remplace l'existant). */
export async function saveCards(cards: OfflineCard[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["cards", "meta"], "readwrite");
  const store = tx.objectStore("cards");
  await store.clear();
  for (const card of cards) {
    await store.put(card);
  }
  await tx.objectStore("meta").put(new Date().toISOString(), "cards_saved_at");
  await tx.done;
}

/** Retourne toutes les cartes en cache. */
export async function getOfflineCards(): Promise<OfflineCard[]> {
  try {
    const db = await getDb();
    return db.getAll("cards");
  } catch {
    return [];
  }
}

/** Date de la dernière mise en cache du deck (undefined si jamais fait). */
export async function getCardsSavedAt(): Promise<string | undefined> {
  try {
    const db = await getDb();
    return (await db.get("meta", "cards_saved_at")) as string | undefined;
  } catch {
    return undefined;
  }
}

// ─── Pending Reviews ──────────────────────────────────────────────────────

/** Enregistre une révision effectuée hors-ligne. */
export async function addPendingReview(cardId: string, quality: number): Promise<void> {
  const db = await getDb();
  const review: PendingReview = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    cardId,
    quality,
    reviewedAt: new Date().toISOString(),
  };
  await db.add("pending_reviews", review);
}

/** Retourne toutes les révisions en attente. */
export async function getPendingReviews(): Promise<PendingReview[]> {
  try {
    const db = await getDb();
    return db.getAll("pending_reviews");
  } catch {
    return [];
  }
}

/** Supprime une révision après synchronisation réussie. */
export async function deletePendingReview(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("pending_reviews", id);
}

/** Nombre de révisions en attente (pour l'indicateur UI). */
export async function getPendingReviewCount(): Promise<number> {
  try {
    const db = await getDb();
    return db.count("pending_reviews");
  } catch {
    return 0;
  }
}
