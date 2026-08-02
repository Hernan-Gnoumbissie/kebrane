"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Blueprint = { id: string; provider: string; level: string; title: string };

type MockExam = {
  id: string;
  title: string;
  isPublished: boolean;
  createdAt: string;
  blueprint: { provider: string; level: string; title: string };
};

export default function AdminExamsPage() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [exams, setExams] = useState<MockExam[]>([]);
  const [blueprintId, setBlueprintId] = useState("");
  const [title, setTitle] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [bRes, eRes] = await Promise.all([
      fetch("/api/admin/blueprints"),
      fetch("/api/admin/mock-exams"),
    ]);
    if (bRes.ok) {
      const data: { blueprints: Blueprint[] } = await bRes.json();
      setBlueprints(data.blueprints);
      if (data.blueprints[0] && !blueprintId) setBlueprintId(data.blueprints[0].id);
    }
    if (eRes.ok) {
      const data: { exams: MockExam[] } = await eRes.json();
      setExams(data.exams);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function assemble(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    setMissing([]);
    const res = await fetch("/api/admin/mock-exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blueprintId, title, mode: "auto" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 422) {
      setErr("Banque de contenu insuffisante pour ce blueprint :");
      setMissing(data.error?.missing ?? []);
      return;
    }
    if (!res.ok) {
      setErr(data.error?.message ?? "Assemblage impossible");
      return;
    }
    setMsg("Examen assemblé (non publié). Publiez-le quand vous êtes prêt.");
    setTitle("");
    void load();
  }

  async function togglePublish(exam: MockExam) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/mock-exams/${exam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !exam.isPublished }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Action impossible");
      return;
    }
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Examens blancs</h1>
      <p className="text-sm text-muted-foreground">
        L&apos;assemblage sélectionne automatiquement du contenu <strong>publié</strong> conforme au
        blueprint (passages + questions, consignes Schreiben, tâches Sprechen). Si la banque est
        insuffisante, les manques exacts sont listés.
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">
          <p>{err}</p>
          {missing.length > 0 ? (
            <ul className="mt-2 list-disc pl-5">
              {missing.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Assembler un examen</CardTitle>
          <CardDescription>22 blueprints officiels disponibles (A1–C2).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={assemble} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="e-blueprint">Blueprint</Label>
              <select
                id="e-blueprint"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={blueprintId}
                onChange={(e) => setBlueprintId(e.target.value)}
                required
              >
                {blueprints.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.provider} {b.level} — {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="e-title">Titre de l&apos;examen blanc</Label>
              <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. : Goethe B1 — Examen blanc n°1" required minLength={3} maxLength={200} />
            </div>
            <Button type="submit" disabled={busy || !blueprintId}>
              {busy ? "Assemblage..." : "Assembler (auto)"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Titre</th>
              <th className="p-3">Blueprint</th>
              <th className="p-3">Créé le</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={5}>
                  Aucun examen blanc pour le moment.
                </td>
              </tr>
            ) : (
              exams.map((ex) => (
                <tr key={ex.id} className="border-t">
                  <td className="p-3">{ex.title}</td>
                  <td className="p-3">
                    {ex.blueprint.provider} {ex.blueprint.level}
                  </td>
                  <td className="p-3">{new Date(ex.createdAt).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">{ex.isPublished ? "✅ Publié" : "Brouillon"}</td>
                  <td className="p-3">
                    <Button size="sm" variant={ex.isPublished ? "outline" : "default"} onClick={() => togglePublish(ex)} disabled={busy}>
                      {ex.isPublished ? "Dépublier" : "Publier"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
