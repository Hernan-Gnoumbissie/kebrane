"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS, LEVELS, SPEAKING_FORMATS, TASK_FORMAT_LABELS } from "@/lib/content-enums";
import { LevelGroup } from "@/components/level-group";

type Task = {
  id: string;
  provider: string;
  level: string;
  partNumber: number;
  taskFormat: string;
  title: string;
  prepTimeSec: number;
  speakTimeSec: number;
  status: string;
};

export default function AdminSpeakingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [provider, setProvider] = useState("GOETHE");
  const [level, setLevel] = useState("B1");
  const [partNumber, setPartNumber] = useState(1);
  const [taskFormat, setTaskFormat] = useState("PRESENTATION");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTimeSec, setPrepTimeSec] = useState(60);
  const [speakTimeSec, setSpeakTimeSec] = useState(120);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/speaking-tasks");
    if (res.ok) {
      const data: { tasks: Task[] } = await res.json();
      setTasks(data.tasks);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/speaking-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        level,
        partNumber,
        taskFormat,
        title,
        instructions,
        prepTimeSec,
        speakTimeSec,
        publish,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Création impossible (vérifiez les champs)");
      return;
    }
    setMsg(`Tâche créée${publish ? " et publiée" : " (brouillon)"}.`);
    setTitle("");
    setInstructions("");
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Tâches Sprechen</h1>
      <p className="text-sm text-muted-foreground">
        Tâches d&apos;expression orale (préparation + temps de parole). Une tâche publiée par
        provider/niveau/partie est requise pour assembler un examen blanc.
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Nouvelle tâche</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="s-provider">Examen</Label>
                <select id="s-provider" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-level">Niveau</Label>
                <select id="s-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-part">N° de partie</Label>
                <Input id="s-part" type="number" min={1} value={partNumber} onChange={(e) => setPartNumber(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-format">Format</Label>
                <select id="s-format" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={taskFormat} onChange={(e) => setTaskFormat(e.target.value)}>
                  {SPEAKING_FORMATS.map((f) => (
                    <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="s-title">Titre</Label>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-instructions">Consigne</Label>
              <textarea
                id="s-instructions"
                className="min-h-28 w-full rounded-md border bg-background p-3 text-sm"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                minLength={10}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="s-prep">Préparation (s)</Label>
                <Input id="s-prep" type="number" min={0} value={prepTimeSec} onChange={(e) => setPrepTimeSec(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-speak">Temps de parole (s)</Label>
                <Input id="s-speak" type="number" min={1} value={speakTimeSec} onChange={(e) => setSpeakTimeSec(Number(e.target.value))} required />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Publier immédiatement
            </label>

            <Button type="submit" disabled={busy}>
              {busy ? "Création..." : "Créer la tâche"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune tâche pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {LEVELS.map((lvl) => {
            const group = tasks.filter((t) => t.level === lvl);
            if (group.length === 0) return null;
            const firstLevel = LEVELS.find((l) => tasks.some((t) => t.level === l));
            return (
              <LevelGroup key={lvl} level={lvl} count={group.length} defaultOpen={lvl === firstLevel}>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-3">Examen</th>
                        <th className="p-3">Partie</th>
                        <th className="p-3">Format</th>
                        <th className="p-3">Titre</th>
                        <th className="p-3">Prép. / Parole</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((t) => (
                        <tr key={t.id} className="border-t">
                          <td className="p-3">{t.provider}</td>
                          <td className="p-3">{t.partNumber}</td>
                          <td className="p-3">{TASK_FORMAT_LABELS[t.taskFormat] ?? t.taskFormat}</td>
                          <td className="p-3">{t.title}</td>
                          <td className="p-3">
                            {t.prepTimeSec}s / {t.speakTimeSec}s
                          </td>
                          <td className="p-3">{t.status === "PUBLISHED" ? "Publiée" : "Brouillon"}</td>
                          <td className="p-3">
                            <Link href={`/admin/speaking/${t.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                              Éditer
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LevelGroup>
            );
          })}
        </div>
      )}
    </main>
  );
}
