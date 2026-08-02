"use client";

import { useEffect, useState } from "react";

type Stats = {
  users: {
    byStatus: Record<string, number>;
    newLast30d: number;
    newLast7d: number;
  };
  attempts: { total: number; last30d: number; practice: number; mock: number };
  writing: Record<string, number>;
  speaking: Record<string, number>;
  ai: {
    totalCostLast30dUsd: number;
    byKind: { kind: string; count: number; costUsd: number; inputTokens: number; outputTokens: number }[];
  };
  learning: { lessonsCompleted: number; levelsMastered: number };
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actifs", PENDING: "En attente", EXPIRED: "Expirés",
  SUSPENDED: "Suspendus", DELETED: "Supprimés",
};

const KIND_LABELS: Record<string, string> = {
  generation: "Génération contenu", writing_eval: "Éval. écriture",
  speaking_eval: "Éval. oral", embedding: "Embeddings",
  tts: "TTS (audio)", stt: "STT (transcription)",
};

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data: Stats) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground p-4">Chargement…</div>;
  if (!stats)  return <div className="text-sm text-destructive p-4">Erreur de chargement.</div>;

  const totalUsers = Object.values(stats.users.byStatus).reduce((a, b) => a + b, 0);
  const writingTotal = Object.values(stats.writing).reduce((a, b) => a + b, 0);
  const speakingTotal = Object.values(stats.speaking).reduce((a, b) => a + b, 0);

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-bold">Statistiques</h1>

      {/* ── Utilisateurs ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Utilisateurs</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total inscrits" value={totalUsers} />
          <KpiCard label="Actifs" value={stats.users.byStatus.ACTIVE ?? 0} />
          <KpiCard label="Nouveaux (7 j)" value={stats.users.newLast7d} />
          <KpiCard label="Nouveaux (30 j)" value={stats.users.newLast30d} />
        </div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Nombre</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.users.byStatus).map(([status, count]) => (
                <tr key={status} className="border-t">
                  <td className="px-3 py-1.5">{STATUS_LABELS[status] ?? status}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{count}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">
                    {totalUsers ? ((count / totalUsers) * 100).toFixed(1) : 0} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Tentatives ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tentatives d&apos;exercices</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total" value={stats.attempts.total} />
          <KpiCard label="Derniers 30 j" value={stats.attempts.last30d} />
          <KpiCard label="Entraînement libre" value={stats.attempts.practice} />
          <KpiCard label="Examens blancs" value={stats.attempts.mock} />
        </div>
      </section>

      {/* ── Soumissions écriture & oral ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Soumissions Schreiben / Sprechen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Écriture — {writingTotal} total</p>
            {Object.entries(stats.writing).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{s}</span>
                <span className="font-mono">{n}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm font-medium">Oral — {speakingTotal} total</p>
            {Object.entries(stats.speaking).map(([s, n]) => (
              <div key={s} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{s}</span>
                <span className="font-mono">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IA ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coûts IA (30 derniers jours)</h2>
        <KpiCard
          label="Coût total estimé"
          value={`$${stats.ai.totalCostLast30dUsd.toFixed(4)}`}
          sub="Tous modèles confondus"
        />
        {stats.ai.byKind.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Appels</th>
                  <th className="px-3 py-2 text-right">Tokens in</th>
                  <th className="px-3 py-2 text-right">Tokens out</th>
                  <th className="px-3 py-2 text-right">Coût ($)</th>
                </tr>
              </thead>
              <tbody>
                {stats.ai.byKind
                  .sort((a, b) => b.costUsd - a.costUsd)
                  .map((r) => (
                    <tr key={r.kind} className="border-t">
                      <td className="px-3 py-1.5">{KIND_LABELS[r.kind] ?? r.kind}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.count}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.inputTokens.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.outputTokens.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{r.costUsd.toFixed(4)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Apprentissage ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Apprentissage</h2>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Leçons complétées (total)" value={stats.learning.lessonsCompleted} />
          <KpiCard label="Niveaux maîtrisés (total)" value={stats.learning.levelsMastered} />
        </div>
      </section>
    </main>
  );
}
