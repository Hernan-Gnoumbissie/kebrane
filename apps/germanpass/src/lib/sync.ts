/**
 * Synchronisation des révisions effectuées hors-ligne.
 * Appelée automatiquement quand la connexion est rétablie.
 */

import { getPendingReviews, deletePendingReview } from "./offline-db";
import { toast } from "./toast";

export type SyncResult = { synced: number; failed: number };

/**
 * Envoie toutes les révisions en attente au serveur.
 * Supprime chaque entrée si la requête réussit.
 * Affiche un toast récapitulatif si au moins une révision est synchronisée.
 */
export async function syncPendingReviews(): Promise<SyncResult> {
  let pending;
  try {
    pending = await getPendingReviews();
  } catch {
    return { synced: 0, failed: 0 };
  }

  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const review of pending) {
    try {
      const res = await fetch(`/api/learn/flashcards/${review.cardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quality: review.quality }),
      });
      if (res.ok || res.status === 202) {
        await deletePendingReview(review.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      // Toujours offline — on laisse en attente
      failed++;
    }
  }

  if (synced > 0) {
    toast.success(
      `Données synchronisées ✓ (${synced} révision${synced > 1 ? "s" : ""})`
    );
  }

  return { synced, failed };
}
