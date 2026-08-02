"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TASK_FORMATS, TASK_FORMAT_LABELS, PROVIDERS, LEVELS } from "@/lib/content-enums";

type OptionDraft = { id?: string; text: string; isCorrect: boolean; position: number };
type QuestionDraft = {
  id?: string;
  taskFormat: string;
  prompt: string;
  points: number;
  position: number;
  explanation: string;
  explanationFr: string;
  explanationEn: string;
  metadataText: string;
  options: OptionDraft[];
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon (non visible)" },
  { value: "PUBLISHED", label: "Publié (visible des apprenants)" },
  { value: "ARCHIVED", label: "Archivé (retiré)" },
];
const VARIETIES = ["DE", "AT", "CH"];
const isMcq = (f: string) => f === "MCQ_SINGLE" || f === "MCQ_MULTI";

export default function EditPassagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [section, setSection] = useState("LESEN");
  const [level, setLevel] = useState("A1");
  const [taskFormat, setTaskFormat] = useState("MCQ_SINGLE");
  const [variety, setVariety] = useState("");
  const [maxListens, setMaxListens] = useState(1);
  const [status, setStatus] = useState("DRAFT");
  const [providers, setProviders] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/passages/${id}`);
      if (!res.ok) {
        setErr("Passage introuvable");
        setLoading(false);
        return;
      }
      const { passage } = await res.json();
      setTitle(passage.title);
      setBody(passage.body);
      setSection(passage.section);
      setLevel(passage.level);
      setTaskFormat(passage.taskFormat);
      setVariety(passage.variety ?? "");
      setMaxListens(passage.maxListens ?? 1);
      setStatus(["PUBLISHED", "ARCHIVED"].includes(passage.status) ? passage.status : "DRAFT");
      setProviders((passage.providers ?? []).map((p: { provider: string }) => p.provider));
      setQuestions(
        (passage.questions ?? []).map((q: Record<string, unknown>) => ({
          id: q.id ? String(q.id) : undefined,
          taskFormat: String(q.taskFormat),
          prompt: String(q.prompt),
          points: Number(q.points),
          position: Number(q.position),
          explanation: (q.explanation as string) ?? "",
          explanationFr: (q.explanationFr as string) ?? "",
          explanationEn: (q.explanationEn as string) ?? "",
          metadataText: q.metadata ? JSON.stringify(q.metadata, null, 2) : "",
          options: ((q.options as Record<string, unknown>[]) ?? []).map((o) => ({
            id: o.id ? String(o.id) : undefined,
            text: String(o.text),
            isCorrect: Boolean(o.isCorrect),
            position: Number(o.position),
          })),
        }))
      );
      setLoading(false);
    }
    void load();
  }, [id]);

  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }
  function addQuestion() {
    setQuestions((qs) => [
      ...qs,
      {
        taskFormat,
        prompt: "",
        points: 1,
        position: qs.length,
        explanation: "",
        explanationFr: "",
        explanationEn: "",
        metadataText: "",
        options: [],
      },
    ]);
  }
  function removeQuestion(i: number) {
    setQuestions((qs) => qs.filter((_, j) => j !== i));
  }
  function updateOption(qi: number, oi: number, patch: Partial<OptionDraft>) {
    setQuestions((qs) =>
      qs.map((q, j) =>
        j === qi ? { ...q, options: q.options.map((o, k) => (k === oi ? { ...o, ...patch } : o)) } : q
      )
    );
  }
  function addOption(qi: number) {
    setQuestions((qs) =>
      qs.map((q, j) => (j === qi ? { ...q, options: [...q.options, { text: "", isCorrect: false, position: q.options.length }] } : q))
    );
  }
  function removeOption(qi: number, oi: number) {
    setQuestions((qs) => qs.map((q, j) => (j === qi ? { ...q, options: q.options.filter((_, k) => k !== oi) } : q)));
  }
  function toggleProvider(p: string) {
    setProviders((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const payloadQuestions: Record<string, unknown>[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      let metadata: unknown = null;
      if (q.metadataText.trim()) {
        try {
          metadata = JSON.parse(q.metadataText);
        } catch {
          setErr(`Question ${i + 1} : le JSON metadata est invalide.`);
          setBusy(false);
          return;
        }
      }
      payloadQuestions.push({
        id: q.id,
        taskFormat: q.taskFormat,
        prompt: q.prompt,
        points: q.points,
        position: q.position,
        explanation: q.explanation || null,
        explanationFr: q.explanationFr || null,
        explanationEn: q.explanationEn || null,
        metadata,
        options: isMcq(q.taskFormat) ? q.options : [],
      });
    }

    const res = await fetch(`/api/admin/passages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        section,
        level,
        taskFormat,
        variety: variety || null,
        maxListens,
        status,
        providers,
        questions: payloadQuestions,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Enregistrement impossible (vérifiez les champs).");
      return;
    }
    setMsg("Passage enregistré ✓");
  }

  async function remove() {
    if (!window.confirm("Supprimer définitivement ce passage et ses questions ?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/passages/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setErr("Suppression impossible");
      return;
    }
    router.push("/admin/passages");
  }

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Éditer le passage</h1>
        <Link href="/admin/passages" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Retour
        </Link>
      </div>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="p-title">Titre</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={200} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="p-section">Section</Label>
              <select id="p-section" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="LESEN">Lesen</option>
                <option value="HOEREN">Hören</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-level">Niveau</Label>
              <select id="p-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-format">Format par défaut</Label>
              <select id="p-format" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={taskFormat} onChange={(e) => setTaskFormat(e.target.value)}>
                {TASK_FORMATS.map((f) => (
                  <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="p-status">Statut</Label>
              <select id="p-status" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            {section === "HOEREN" ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="p-variety">Variété audio</Label>
                  <select id="p-variety" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={variety} onChange={(e) => setVariety(e.target.value)}>
                    <option value="">—</option>
                    {VARIETIES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="p-listens">Écoutes max</Label>
                  <Input id="p-listens" type="number" min={1} max={10} value={maxListens} onChange={(e) => setMaxListens(Number(e.target.value))} />
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label>Examens compatibles</Label>
            <div className="flex flex-wrap gap-3">
              {PROVIDERS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={providers.includes(p)} onChange={() => toggleProvider(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="p-body">
              {section === "HOEREN" ? "Transcript (script audio — non montré au candidat)" : "Texte du passage"}
            </Label>
            <textarea id="p-body" className="min-h-40 w-full rounded-md border bg-background p-3 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune question. Ajoutez-en une ci-dessous.</p>
          ) : (
            questions.map((q, i) => (
              <div key={i} className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label>Format</Label>
                    <select className="h-9 rounded-md border bg-background px-3 text-sm" value={q.taskFormat} onChange={(e) => updateQuestion(i, { taskFormat: e.target.value })}>
                      {TASK_FORMATS.map((f) => (
                        <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Points</Label>
                    <Input type="number" min={0.5} step={0.5} className="w-24" value={q.points} onChange={(e) => updateQuestion(i, { points: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Position</Label>
                    <Input type="number" min={0} className="w-24" value={q.position} onChange={(e) => updateQuestion(i, { position: Number(e.target.value) })} />
                  </div>
                  <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => removeQuestion(i)}>
                    Supprimer
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label>Énoncé</Label>
                  <Input value={q.prompt} onChange={(e) => updateQuestion(i, { prompt: e.target.value })} />
                </div>

                {isMcq(q.taskFormat) ? (
                  <div className="space-y-2">
                    <Label>Options (cochez la/les bonne(s) réponse(s))</Label>
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="checkbox" checked={o.isCorrect} onChange={(e) => updateOption(i, oi, { isCorrect: e.target.checked })} title="Bonne réponse" />
                        <Input value={o.text} onChange={(e) => updateOption(i, oi, { text: e.target.value })} placeholder={`Option ${oi + 1}`} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i, oi)}>✕</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(i)}>+ Option</Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>Metadata (JSON — clés de correction)</Label>
                    <p className="text-xs text-muted-foreground">
                      TRUE_FALSE : {"{ \"correct\": true }"} · GAP_FILL : {"{ \"textWithGaps\", \"gaps\":[{\"gapId\",\"accepted\":[]}] }"} · ORDERING : {"{ \"items\":[{\"itemId\",\"text\"}], \"correctOrder\":[] }"} · MATCHING : {"{ \"pairs\":[{\"leftId\",\"left\",\"rightId\",\"right\"}] }"}
                    </p>
                    <textarea className="min-h-28 w-full rounded-md border bg-background p-3 font-mono text-xs" value={q.metadataText} onChange={(e) => updateQuestion(i, { metadataText: e.target.value })} />
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Explication DE</Label>
                    <Input value={q.explanation} onChange={(e) => updateQuestion(i, { explanation: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Explication FR</Label>
                    <Input value={q.explanationFr} onChange={(e) => updateQuestion(i, { explanationFr: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Explication EN</Label>
                    <Input value={q.explanationEn} onChange={(e) => updateQuestion(i, { explanationEn: e.target.value })} />
                  </div>
                </div>
              </div>
            ))
          )}
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            + Ajouter une question
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button variant="destructive" onClick={remove} disabled={busy}>
          Supprimer le passage
        </Button>
      </div>
    </main>
  );
}
