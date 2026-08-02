"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_FORMATS, TASK_FORMAT_LABELS } from "@/lib/content-enums";

type ExerciseDraft = {
  taskFormat: string;
  prompt: string;
  points: number;
  isChapterTest: boolean;
  position: number;
  metadataText: string;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "DRAFT", label: "Brouillon (non visible)" },
  { value: "PUBLISHED", label: "Publiée (visible des apprenants)" },
  { value: "ARCHIVED", label: "Archivée (retirée)" },
];

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [position, setPosition] = useState(0);
  const [contentMd, setContentMd] = useState("");
  const [helpFr, setHelpFr] = useState("");
  const [helpEn, setHelpEn] = useState("");
  const [courseLabel, setCourseLabel] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/lessons/${id}`);
      if (!res.ok) {
        setErr("Leçon introuvable");
        setLoading(false);
        return;
      }
      const { lesson } = await res.json();
      setTitle(lesson.title);
      setStatus(["PUBLISHED", "ARCHIVED"].includes(lesson.status) ? lesson.status : "DRAFT");
      setPosition(lesson.position);
      setContentMd(lesson.contentMd);
      setHelpFr(lesson.helpFr ?? "");
      setHelpEn(lesson.helpEn ?? "");
      setCourseLabel(lesson.course ? `${lesson.course.level} — ${lesson.course.title}` : "");
      setExercises(
        (lesson.exercises ?? []).map((ex: Record<string, unknown>) => ({
          taskFormat: String(ex.taskFormat),
          prompt: String(ex.prompt),
          points: Number(ex.points),
          isChapterTest: Boolean(ex.isChapterTest),
          position: Number(ex.position),
          metadataText: JSON.stringify(ex.metadata ?? {}, null, 2),
        }))
      );
      setLoading(false);
    }
    void load();
  }, [id]);

  function updateExercise(i: number, patch: Partial<ExerciseDraft>) {
    setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function addExercise() {
    setExercises((xs) => [
      ...xs,
      {
        taskFormat: "MCQ_SINGLE",
        prompt: "",
        points: 1,
        isChapterTest: false,
        position: xs.length,
        metadataText: '{\n  "options": [{ "id": "a", "text": "", "isCorrect": true }]\n}',
      },
    ]);
  }
  function removeExercise(i: number) {
    setExercises((xs) => xs.filter((_, j) => j !== i));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const parsedExercises: Record<string, unknown>[] = [];
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]!;
      let metadata: unknown;
      try {
        metadata = JSON.parse(ex.metadataText);
      } catch {
        setErr(`Exercice ${i + 1} : le JSON metadata est invalide.`);
        setBusy(false);
        return;
      }
      parsedExercises.push({
        taskFormat: ex.taskFormat,
        prompt: ex.prompt,
        points: ex.points,
        isChapterTest: ex.isChapterTest,
        position: ex.position,
        metadata,
      });
    }

    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        status,
        position,
        contentMd,
        helpFr: helpFr || null,
        helpEn: helpEn || null,
        exercises: parsedExercises,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Enregistrement impossible (vérifiez les champs).");
      return;
    }
    setMsg("Leçon enregistrée ✓");
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement cette leçon et ses exercices ?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setErr("Suppression impossible");
      return;
    }
    router.push("/admin/courses");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Éditer la leçon</h1>
          {courseLabel ? <p className="text-sm text-muted-foreground">{courseLabel}</p> : null}
        </div>
        <Link href="/admin/courses" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Retour
        </Link>
      </div>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_110px]">
            <div className="space-y-1">
              <Label htmlFor="l-title">Titre</Label>
              <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-status">Statut</Label>
              <select id="l-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-pos">Position</Label>
              <Input id="l-pos" type="number" min={0} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="l-content">Contenu (Markdown, allemand niveaugerecht)</Label>
            <textarea id="l-content" className="min-h-48 w-full rounded-md border bg-background p-3 font-mono text-sm" value={contentMd} onChange={(e) => setContentMd(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="l-helpfr">Aide FR (optionnel)</Label>
              <textarea id="l-helpfr" className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={helpFr} onChange={(e) => setHelpFr(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-helpen">Aide EN (optionnel)</Label>
              <textarea id="l-helpen" className="min-h-28 w-full rounded-md border bg-background p-3 text-sm" value={helpEn} onChange={(e) => setHelpEn(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exercices ({exercises.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun exercice. Ajoutez-en un ci-dessous.</p>
          ) : (
            exercises.map((ex, i) => (
              <div key={i} className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label>Format</Label>
                    <select className="h-9 rounded-md border bg-background px-3 text-sm" value={ex.taskFormat} onChange={(e) => updateExercise(i, { taskFormat: e.target.value })}>
                      {TASK_FORMATS.map((f) => (
                        <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Points</Label>
                    <Input type="number" min={0.5} step={0.5} className="w-24" value={ex.points} onChange={(e) => updateExercise(i, { points: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Position</Label>
                    <Input type="number" min={0} className="w-24" value={ex.position} onChange={(e) => updateExercise(i, { position: Number(e.target.value) })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={ex.isChapterTest} onChange={(e) => updateExercise(i, { isChapterTest: e.target.checked })} />
                    Mini-test de fin de chapitre
                  </label>
                  <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => removeExercise(i)}>
                    Supprimer
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>Énoncé (prompt)</Label>
                  <Input value={ex.prompt} onChange={(e) => updateExercise(i, { prompt: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Metadata (JSON : options, réponses, paires…)</Label>
                  <textarea className="min-h-28 w-full rounded-md border bg-background p-3 font-mono text-xs" value={ex.metadataText} onChange={(e) => updateExercise(i, { metadataText: e.target.value })} />
                </div>
              </div>
            ))
          )}
          <Button type="button" variant="outline" size="sm" onClick={addExercise}>
            + Ajouter un exercice
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          Supprimer la leçon
        </Button>
      </div>
    </main>
  );
}
