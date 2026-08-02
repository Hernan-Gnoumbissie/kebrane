"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ExternalLink, Loader2, X } from "lucide-react";

export type ProofRow = {
  id: string;
  filePath: string;
  note: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
};

const APPROVE_DAYS = [7, 30, 90, 365] as const;

export function PendingProofsWidget({ initial }: { initial: ProofRow[] }) {
  const [proofs, setProofs] = useState<ProofRow[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // État du formulaire de refus inline (par ligne)
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function reload() {
    try {
      const res = await fetch("/api/admin/proofs?status=PENDING");
      if (res.ok) {
        const data: { proofs: ProofRow[] } = await res.json();
        setProofs(data.proofs.slice(0, 5));
      }
    } catch {
      // Silencieux — la liste stale reste affichée, l'action a déjà réussi
    }
  }

  async function decide(
    id: string,
    body: { decision: "approve"; days: number } | { decision: "reject"; reason: string }
  ) {
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/admin/proofs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr((data as { error?: { message?: string } }).error?.message ?? "Action impossible");
      return;
    }
    setRejectingId(null);
    setRejectReason("");
    await reload();
  }

  function startRejection(id: string) {
    setRejectingId(id);
    setRejectReason("");
    setErr(null);
  }

  function cancelRejection() {
    setRejectingId(null);
    setRejectReason("");
  }

  if (proofs.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <CheckCircle className="h-4 w-4 text-green-500" />
        Aucune preuve en attente
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {err && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
          <p className="text-sm text-red-600">{err}</p>
          <button
            type="button"
            onClick={() => setErr(null)}
            className="ml-2 shrink-0 text-red-400 hover:text-red-600"
            aria-label="Fermer l'erreur"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {proofs.map((p) => (
        <div
          key={p.id}
          className="rounded-xl border border-gray-100 bg-gray-50 p-3"
        >
          {/* En-tête de ligne */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">
                {p.user.name ?? "—"}
                <span className="ml-1 text-gray-500">— {p.user.email}</span>
              </p>
              <p className="text-xs text-gray-400">
                {new Date(p.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {/* Voir la preuve */}
              <a
                href={`/api/files/${p.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[30px] items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="h-3 w-3" />
                Voir
              </a>

              {/* Boutons d'approbation */}
              {APPROVE_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => void decide(p.id, { decision: "approve", days: d })}
                  className="flex min-h-[30px] items-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  +{d}j
                </button>
              ))}

              {/* Bouton Refuser (masqué si formulaire déjà ouvert pour cette ligne) */}
              {rejectingId !== p.id && (
                <button
                  type="button"
                  disabled={busy === p.id}
                  onClick={() => startRejection(p.id)}
                  className="flex min-h-[30px] items-center gap-1 rounded-md bg-red-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  <XCircle className="h-3 w-3" />
                  Refuser
                </button>
              )}
            </div>
          </div>

          {/* Formulaire de refus inline */}
          {rejectingId === p.id && (
            <div className="mt-3 flex flex-col gap-2 rounded-lg border border-red-100 bg-red-50 p-3">
              <label
                htmlFor={`reject-reason-${p.id}`}
                className="text-xs font-medium text-red-700"
              >
                Motif du refus <span aria-hidden="true">*</span>
              </label>
              <textarea
                id={`reject-reason-${p.id}`}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquer pourquoi la preuve est refusée…"
                rows={2}
                maxLength={500}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className="w-full resize-none rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-red-400">
                  {rejectReason.length}/500 · min. 3 caractères
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelRejection}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={rejectReason.trim().length < 3 || busy === p.id}
                    onClick={() =>
                      void decide(p.id, {
                        decision: "reject",
                        reason: rejectReason.trim(),
                      })
                    }
                    className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {busy === p.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    Confirmer le refus
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
