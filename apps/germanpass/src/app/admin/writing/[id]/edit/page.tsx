"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS, LEVELS, WRITING_FORMATS, TASK_FORMAT_LABELS } from "@/lib/content-enums";

type Criterion = { key: string; labelDe: string; labelFr: string; maxPoints: number; description: string };

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon (non visible)" },
  { value: "PUBLISHED", label: "Publiée (visible des apprenants)" },
  { value: "ARCHIVED", label: "Archivée (retirée)" },
];

export default function EditWritingPromptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [provider, setProvider] = useState("GOETHE");
  const [level, setLevel] = useState("B1");
  const [taskNumber, setTaskNumber] = useState(1);
  const [taskFormat, setTaskFormat] = useState("LETTER_FORMAL");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [minWords, setMinWords] = useState<number | "">("");
  const [maxWords, setMaxWords] = useState<number | "">("");
  const [timeLimitMin, setTimeLimitMin] = useState(30);
  const [status, setStatus] = useState("DRAFT");
  const [criteria, setCriteria] = useState<Criterion[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/writing-prompts/${id}`);
      if (!res.ok) {
        setErr("Consigne introuvable");
        setLoading(false);
        return;
      }
      const { prompt } = await res.json();
      setProvider(prompt.provider);
      setLevel(prompt.level);
      setTaskNumber(prompt.taskNumber);
      setTaskFormat(prompt.taskFormat);
      setTitle(prompt.title);
      setInstructions(prompt.instructions);
      setMinWords(prompt.minWords ?? "");
      setMaxWords(prompt.maxWords ?? "");
      setTimeLimitMin(prompt.timeLimitMin);
      setStatus(["PUBLISHED", "ARCHIVED"].includes(prompt.status) ? prompt.status : "DRAFT");
      setCriteria(
        (Array.isArray(prompt.criteria) ? prompt.criteria : []).map((c: Record<string, unknown>) => ({
          key: String(c.key ?? ""),
          labelDe: String(c.labelDe ?? ""),
          labelFr: String(c.labelFr ?? ""),
          maxPoints: Number(c.maxPoints ?? 1),
          description: String(c.description ?? ""),
        }))
      );
      setLoading(false);
    }
    void load();
  }, [id]);

  function setCriterion(i: number, patch: Partial<Criterion>) {
    setCriteria((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/writing-prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        level,
        taskNumber,
        taskFormat,
        title,
        instructions,
        minWords: minWords === "" ? null : minWords,
        maxWords: maxWords === "" ? null : maxWords,
        timeLimitMin,
        status,
        criteria: criteria.map((c) => ({
          key: c.key,
          labelDe: c.labelDe,
          ...(c.labelFr ? { labelFr: c.labelFr } : {}),
          maxPoints: c.maxPoints,
          ...(c.description ? { description: c.description } : {}),
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Enregistrement impossible (vérifiez les champs).");
      return;
    }
    setMsg("Consigne enregistrée ✓");
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement cette consigne ?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/writing-prompts/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setErr("Suppression impossible");
      return;
    }
    router.push("/admin/writing");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Éditer la consigne Schreiben</h1>
        <Link href="/admin/writing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Retour
        </Link>
      </div>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consigne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="w-provider">Examen</Label>
              <select id="w-provider" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-level">Niveau</Label>
              <select id="w-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-task">N° de tâche</Label>
              <Input id="w-task" type="number" min={1} value={taskNumber} onChange={(e) => setTaskNumber(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-format">Format</Label>
              <select id="w-format" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={taskFormat} onChange={(e) => setTaskFormat(e.target.value)}>
                {WRITING_FORMATS.map((f) => (
                  <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-1">
              <Label htmlFor="w-title">Titre</Label>
              <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-status">Statut</Label>
              <select id="w-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="w-instructions">Consigne (bilingue conseillé)</Label>
            <textarea id="w-instructions" className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="w-min">Mots min (opt.)</Label>
              <Input id="w-min" type="number" min={1} value={minWords} onChange={(e) => setMinWords(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-max">Mots max (opt.)</Label>
              <Input id="w-max" type="number" min={1} value={maxWords} onChange={(e) => setMaxWords(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-time">Durée (min)</Label>
              <Input id="w-time" type="number" min={1} value={timeLimitMin} onChange={(e) => setTimeLimitMin(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Critères d&apos;évaluation</Label>
            {criteria.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_90px_36px] items-center gap-2">
                <Input aria-label="Clé" placeholder="clé (ex. inhalt)" value={c.key} onChange={(e) => setCriterion(i, { key: e.target.value })} />
                <Input aria-label="Libellé DE" placeholder="Libellé DE" value={c.labelDe} onChange={(e) => setCriterion(i, { labelDe: e.target.value })} />
                <Input aria-label="Libellé FR" placeholder="Libellé FR (opt.)" value={c.labelFr} onChange={(e) => setCriterion(i, { labelFr: e.target.value })} />
                <Input aria-label="Points max" type="number" min={1} value={c.maxPoints} onChange={(e) => setCriterion(i, { maxPoints: Number(e.target.value) })} />
                <Button type="button" variant="ghost" size="sm" aria-label="Retirer le critère" onClick={() => setCriteria((cs) => cs.filter((_, idx) => idx !== i))} disabled={criteria.length <= 1}>
                  ✕
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setCriteria((cs) => [...cs, { key: "", labelDe: "", labelFr: "", maxPoints: 5, description: "" }])}>
              + Ajouter un critère
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          Supprimer la consigne
        </Button>
      </div>
    </main>
  );
}
