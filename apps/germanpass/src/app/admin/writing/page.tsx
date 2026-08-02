"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDERS, LEVELS, WRITING_FORMATS, TASK_FORMAT_LABELS } from "@/lib/content-enums";
import { LevelGroup } from "@/components/level-group";

type Criterion = { key: string; labelDe: string; maxPoints: number };

type Prompt = {
  id: string;
  provider: string;
  level: string;
  taskNumber: number;
  taskFormat: string;
  title: string;
  status: string;
  timeLimitMin: number;
};

export default function AdminWritingPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [provider, setProvider] = useState("GOETHE");
  const [level, setLevel] = useState("B1");
  const [taskNumber, setTaskNumber] = useState(1);
  const [taskFormat, setTaskFormat] = useState("LETTER_FORMAL");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [minWords, setMinWords] = useState<number | "">("");
  const [maxWords, setMaxWords] = useState<number | "">("");
  const [timeLimitMin, setTimeLimitMin] = useState(30);
  const [criteria, setCriteria] = useState<Criterion[]>([
    { key: "inhalt", labelDe: "Inhalt", maxPoints: 5 },
  ]);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/writing-prompts");
    if (res.ok) {
      const data: { prompts: Prompt[] } = await res.json();
      setPrompts(data.prompts);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setCriterion(i: number, patch: Partial<Criterion>) {
    setCriteria((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/writing-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        level,
        taskNumber,
        taskFormat,
        title,
        instructions,
        ...(minWords !== "" ? { minWords } : {}),
        ...(maxWords !== "" ? { maxWords } : {}),
        timeLimitMin,
        criteria,
        publish,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Création impossible (vérifiez les champs)");
      return;
    }
    setMsg(`Consigne créée${publish ? " et publiée" : " (brouillon)"}.`);
    setTitle("");
    setInstructions("");
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Consignes Schreiben</h1>
      <p className="text-sm text-muted-foreground">
        Consignes d&apos;expression écrite avec critères publics d&apos;évaluation (utilisés par
        l&apos;éval IA). Une consigne publiée par provider/niveau/tâche est requise pour assembler
        un examen blanc.
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Nouvelle consigne</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
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

            <div className="space-y-1">
              <Label htmlFor="w-title">Titre</Label>
              <Input id="w-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="w-instructions">Consigne (bilingue conseillé)</Label>
              <textarea
                id="w-instructions"
                className="min-h-28 w-full rounded-md border bg-background p-3 text-sm"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
                minLength={10}
              />
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
                <Input id="w-time" type="number" min={1} value={timeLimitMin} onChange={(e) => setTimeLimitMin(Number(e.target.value))} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Critères d&apos;évaluation</Label>
              {criteria.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_90px_36px] items-center gap-2">
                  <Input aria-label="Clé" placeholder="clé (ex. inhalt)" value={c.key} onChange={(e) => setCriterion(i, { key: e.target.value })} required />
                  <Input aria-label="Libellé DE" placeholder="Libellé DE" value={c.labelDe} onChange={(e) => setCriterion(i, { labelDe: e.target.value })} required />
                  <Input aria-label="Points max" type="number" min={1} value={c.maxPoints} onChange={(e) => setCriterion(i, { maxPoints: Number(e.target.value) })} required />
                  <Button type="button" variant="ghost" size="sm" aria-label="Retirer le critère" onClick={() => setCriteria((cs) => cs.filter((_, idx) => idx !== i))} disabled={criteria.length <= 1}>
                    ✕
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setCriteria((cs) => [...cs, { key: "", labelDe: "", maxPoints: 5 }])}>
                + Ajouter un critère
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Publier immédiatement
            </label>

            <Button type="submit" disabled={busy}>
              {busy ? "Création..." : "Créer la consigne"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {prompts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune consigne pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {LEVELS.map((lvl) => {
            const group = prompts.filter((p) => p.level === lvl);
            if (group.length === 0) return null;
            const firstLevel = LEVELS.find((l) => prompts.some((p) => p.level === l));
            return (
              <LevelGroup key={lvl} level={lvl} count={group.length} defaultOpen={lvl === firstLevel}>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="p-3">Examen</th>
                        <th className="p-3">Tâche</th>
                        <th className="p-3">Format</th>
                        <th className="p-3">Titre</th>
                        <th className="p-3">Durée</th>
                        <th className="p-3">Statut</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3">{p.provider}</td>
                          <td className="p-3">{p.taskNumber}</td>
                          <td className="p-3">{TASK_FORMAT_LABELS[p.taskFormat] ?? p.taskFormat}</td>
                          <td className="p-3">{p.title}</td>
                          <td className="p-3">{p.timeLimitMin} min</td>
                          <td className="p-3">{p.status === "PUBLISHED" ? "Publiée" : "Brouillon"}</td>
                          <td className="p-3">
                            <Link href={`/admin/writing/${p.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
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
