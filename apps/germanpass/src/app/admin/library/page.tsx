"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVELS } from "@/lib/content-enums";

type Doc = {
  id: string;
  title: string;
  level: string | null;
  status: string;
  fileSize: number;
  errorMessage: string | null;
  createdAt: string;
  _count: { chunks: number };
};

const STATUS_LABEL: Record<string, string> = {
  UPLOADED: "En attente d'ingestion",
  PROCESSING: "Ingestion...",
  READY: "Prêt (RAG)",
  ERROR: "Erreur",
};

export default function AdminLibraryPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/documents");
    if (res.ok) {
      const data: { documents: Doc[] } = await res.json();
      setDocs(data.documents);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    const form = new FormData();
    form.set("file", file);
    if (level) form.set("level", level);
    const res = await fetch("/api/admin/documents", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Envoi impossible");
      return;
    }
    setMsg("Document envoyé — ingestion en cours (worker).");
    setFile(null);
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Bibliothèque RAG</h1>
      <p className="text-sm text-muted-foreground">
        Documents sources (PDF, DOCX, TXT, MD) sur lesquels s&apos;ancrent les générations IA.
        L&apos;ingestion (chunking + embeddings) est asynchrone : lancez le worker (
        <code>npm run worker</code>).
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Ajouter un document</CardTitle>
          <CardDescription>Le niveau est optionnel mais améliore le ciblage RAG.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="file">Fichier</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="level">Niveau (optionnel)</Label>
              <select
                id="level"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">—</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={busy || !file}>
              {busy ? "Envoi..." : "Téléverser"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Niveau</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Chunks</th>
              <th className="p-3">Taille</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={6}>
                  Aucun document pour le moment.
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.title}</td>
                  <td className="p-3">{d.level ?? "—"}</td>
                  <td className="p-3">
                    {STATUS_LABEL[d.status] ?? d.status}
                    {d.errorMessage ? (
                      <span className="block text-xs text-destructive">{d.errorMessage}</span>
                    ) : null}
                  </td>
                  <td className="p-3">{d._count.chunks}</td>
                  <td className="p-3">{(d.fileSize / 1024).toFixed(0)} Ko</td>
                  <td className="p-3">{new Date(d.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
