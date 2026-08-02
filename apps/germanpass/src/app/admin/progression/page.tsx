"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UserProgress = {
  id: string;
  name: string;
  email: string;
  currentLevel: string;
  targetLevel: string | null;
  targetProvider: string | null;
  lessonsCompleted: number;
  lessonsTotal: number;
  progressPct: number;
  levelsMastered: string[];
  lastAttemptAt: string | null;
  lastScorePct: number | null;
  memberSince: string;
};

function ProgressBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-yellow-400" : "bg-muted-foreground/30";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums">{pct} %</span>
    </div>
  );
}

export default function AdminProgressionPage() {
  const [users, setUsers]   = useState<UserProgress[]>([]);
  const [q, setQ]           = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal]   = useState(0);

  async function load(query = "", pageNum = 1) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNum) });
    if (query) params.set("q", query);
    const res = await fetch(`/api/admin/progression?${params.toString()}`);
    if (res.ok) {
      const data: { users: UserProgress[]; total: number; page: number; pageSize: number } =
        await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Progression</h1>

      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => { e.preventDefault(); void load(q, 1); }}
      >
        <Input
          placeholder="Nom ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit">Filtrer</Button>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-2 py-1.5">Apprenant</th>
                <th className="px-2 py-1.5">Objectif</th>
                <th className="px-2 py-1.5">Niveau actuel</th>
                <th className="px-2 py-1.5">Leçons</th>
                <th className="px-2 py-1.5">Avancement</th>
                <th className="px-2 py-1.5">Niveaux maîtrisés</th>
                <th className="px-2 py-1.5">Dernier score</th>
                <th className="px-2 py-1.5">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">
                    Aucun résultat.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-1.5">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-2 py-1.5">
                    {u.targetProvider && u.targetLevel
                      ? `${u.targetProvider} ${u.targetLevel}`
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {u.currentLevel}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {u.lessonsCompleted} / {u.lessonsTotal}
                  </td>
                  <td className="px-2 py-1.5">
                    <ProgressBar pct={u.progressPct} />
                  </td>
                  <td className="px-2 py-1.5">
                    {u.levelsMastered.length > 0
                      ? u.levelsMastered.join(", ")
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {u.lastScorePct != null ? `${u.lastScorePct} %` : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {fmt(u.lastAttemptAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} apprenant{total > 1 ? "s" : ""} — page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => void load(q, page - 1)}
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => void load(q, page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
