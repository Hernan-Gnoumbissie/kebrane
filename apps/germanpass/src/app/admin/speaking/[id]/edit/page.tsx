"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS, LEVELS, SPEAKING_FORMATS, TASK_FORMAT_LABELS } from "@/lib/content-enums";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon (non visible)" },
  { value: "PUBLISHED", label: "Publiée (visible des apprenants)" },
  { value: "ARCHIVED", label: "Archivée (retirée)" },
];

export default function EditSpeakingTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [provider, setProvider] = useState("GOETHE");
  const [level, setLevel] = useState("B1");
  const [partNumber, setPartNumber] = useState(1);
  const [taskFormat, setTaskFormat] = useState("PRESENTATION");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTimeSec, setPrepTimeSec] = useState(60);
  const [speakTimeSec, setSpeakTimeSec] = useState(120);
  const [stimulusImagePath, setStimulusImagePath] = useState("");
  const [status, setStatus] = useState("DRAFT");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/speaking-tasks/${id}`);
      if (!res.ok) {
        setErr("Tâche introuvable");
        setLoading(false);
        return;
      }
      const { task } = await res.json();
      setProvider(task.provider);
      setLevel(task.level);
      setPartNumber(task.partNumber);
      setTaskFormat(task.taskFormat);
      setTitle(task.title);
      setInstructions(task.instructions);
      setPrepTimeSec(task.prepTimeSec);
      setSpeakTimeSec(task.speakTimeSec);
      setStimulusImagePath(task.stimulusImagePath ?? "");
      setStatus(["PUBLISHED", "ARCHIVED"].includes(task.status) ? task.status : "DRAFT");
      setLoading(false);
    }
    void load();
  }, [id]);

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/speaking-tasks/${id}`, {
      method: "PATCH",
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
        stimulusImagePath: stimulusImagePath || null,
        status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Enregistrement impossible (vérifiez les champs).");
      return;
    }
    setMsg("Tâche enregistrée ✓");
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement cette tâche ?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/speaking-tasks/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setErr("Suppression impossible");
      return;
    }
    router.push("/admin/speaking");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Éditer la tâche Sprechen</h1>
        <Link href="/admin/speaking" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Retour
        </Link>
      </div>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tâche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-1">
              <Label htmlFor="s-title">Titre</Label>
              <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-status">Statut</Label>
              <select id="s-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="s-instructions">Consigne</Label>
            <textarea id="s-instructions" className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="s-prep">Préparation (s)</Label>
              <Input id="s-prep" type="number" min={0} value={prepTimeSec} onChange={(e) => setPrepTimeSec(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-speak">Temps de parole (s)</Label>
              <Input id="s-speak" type="number" min={1} value={speakTimeSec} onChange={(e) => setSpeakTimeSec(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-stimulus">Image stimulus (chemin, opt.)</Label>
              <Input id="s-stimulus" value={stimulusImagePath} onChange={(e) => setStimulusImagePath(e.target.value)} placeholder="stimuli/…" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          Supprimer la tâche
        </Button>
      </div>
    </main>
  );
}
