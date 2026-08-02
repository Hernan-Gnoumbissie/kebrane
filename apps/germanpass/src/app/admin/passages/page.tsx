"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { LEVELS } from "@/lib/content-enums";
import { LevelGroup, SubGroup } from "@/components/level-group";

type Passage = {
  id: string;
  title: string;
  section: string;
  level: string;
  taskFormat: string;
  status: string;
  sourceOrigin: string;
  audioPath: string | null;
  createdAt: string;
  providers: { provider: string }[];
  _count: { questions: number };
};

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED:      "bg-green-100 text-green-700",
  DRAFT:          "bg-yellow-100 text-yellow-700",
  PENDING_REVIEW: "bg-blue-100 text-blue-700",
  REJECTED:       "bg-red-100 text-red-700",
  ARCHIVED:       "bg-gray-100 text-gray-500",
};

const FORMAT_SHORT: Record<string, string> = {
  MCQ_SINGLE: "QCM", MCQ_MULTI: "QCM+", TRUE_FALSE: "V/F",
  MATCHING: "Asso.", GAP_FILL: "Lacune", ORDERING: "Ordre",
};

export default function AdminPassagesPage() {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [section, setSection]   = useState("");
  const [level, setLevel]       = useState("");
  const [status, setStatus]     = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (section) params.set("section", section);
    if (level)   params.set("level", level);
    if (status)  params.set("status", status);
    const res = await fetch(`/api/admin/passages?${params}`);
    if (res.ok) {
      const data: { passages: Passage[] } = await res.json();
      setPassages(data.passages);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [section, level, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, action: "publish" | "unpublish" | "archive") {
    setBusy(id);
    await fetch(`/api/admin/passages?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    void load();
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Passages Lesen / Hören</h1>
        <span className="text-xs text-muted-foreground">{passages.length} passage(s)</span>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={section} onChange={(e) => setSection(e.target.value)}
        >
          <option value="">Toutes sections</option>
          <option value="LESEN">Lesen</option>
          <option value="HOEREN">Hören</option>
        </select>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={level} onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">Tous niveaux</option>
          {["A1","A2","B1","B2","C1","C2"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value={status} onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PENDING_REVIEW">En révision</option>
          <option value="PUBLISHED">Publié</option>
          <option value="REJECTED">Rejeté</option>
        </select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setSection(""); setLevel(""); setStatus(""); }}>
          Réinitialiser
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        passages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun passage trouvé.</p>
        ) : (
          <div className="space-y-3">
            {LEVELS.map((lvl) => {
              const group = passages.filter((p) => p.level === lvl);
              if (group.length === 0) return null;
              const firstLevel = LEVELS.find((l) => passages.some((p) => p.level === l));
              return (
                <LevelGroup key={lvl} level={lvl} count={group.length} defaultOpen={lvl === firstLevel}>
                  {(["LESEN", "HOEREN"] as const).map((sec) => {
                    const sub = group.filter((p) => p.section === sec);
                    if (sub.length === 0) return null;
                    return (
                      <SubGroup key={sec} label={sec === "LESEN" ? "Lesen" : "Hören"} count={sub.length}>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-2 py-1.5">Titre</th>
                          <th className="px-2 py-1.5">Format</th>
                          <th className="px-2 py-1.5">Questions</th>
                          <th className="px-2 py-1.5">Providers</th>
                          <th className="px-2 py-1.5">Audio</th>
                          <th className="px-2 py-1.5">Statut</th>
                          <th className="px-2 py-1.5">Créé</th>
                          <th className="px-2 py-1.5">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sub.map((p) => (
                          <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="px-2 py-1.5 max-w-[200px] truncate" title={p.title}>
                              {p.title}
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {FORMAT_SHORT[p.taskFormat] ?? p.taskFormat}
                            </td>
                            <td className="px-2 py-1.5 text-center tabular-nums">{p._count.questions}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {p.providers.map((pr) => pr.provider).join(", ") || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {p.audioPath ? "🔊" : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-muted-foreground">{fmt(p.createdAt)}</td>
                            <td className="px-2 py-1.5">
                              <div className="flex gap-1">
                                <Link
                                  href={`/admin/passages/${p.id}/edit`}
                                  className={buttonVariants({ variant: "outline", size: "sm" }) + " h-6 px-1.5 text-[10px]"}
                                >
                                  Éditer
                                </Link>
                                {p.status !== "PUBLISHED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-1.5 text-[10px]"
                                    disabled={busy === p.id}
                                    onClick={() => void act(p.id, "publish")}
                                  >
                                    Publier
                                  </Button>
                                )}
                                {p.status === "PUBLISHED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-1.5 text-[10px]"
                                    disabled={busy === p.id}
                                    onClick={() => void act(p.id, "unpublish")}
                                  >
                                    Dépublier
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] text-muted-foreground"
                                  disabled={busy === p.id}
                                  onClick={() => void act(p.id, "archive")}
                                >
                                  Archiver
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                      </SubGroup>
                    );
                  })}
                </LevelGroup>
              );
            })}
          </div>
        )
      )}
    </main>
  );
}
