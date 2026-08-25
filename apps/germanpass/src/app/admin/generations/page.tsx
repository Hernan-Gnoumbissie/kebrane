"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PROVIDERS,
  LEVELS,
  SECTIONS_RECEPTIVE,
  TASK_FORMATS,
  TASK_FORMAT_LABELS,
} from "@/lib/content-enums";
import { SITUATIONS } from "@/lib/hoeren/situations";
import { LevelGroup, SubGroup } from "@/components/level-group";

type Passage = {
  id: string;
  title: string;
  body: string;
  section: string;
  audioPath: string | null;
  questions: { id: string; prompt: string }[];
};

type LessonPreview = {
  id: string;
  title: string;
  contentMd: string;
  course: { title: string; level: string };
  exercises: { id: string; prompt: string }[];
};

type Generation = {
  id: string;
  targetType: string;
  provider: string | null;
  level: string;
  section: string | null;
  taskFormat: string | null;
  status: string;
  rejectReason: string | null;
  similarityMax: number | null;
  resultId: string | null;
  createdAt: string;
  passage: Passage | null;
  lesson: LessonPreview | null;
};

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "En file",
  RUNNING: "Génération...",
  PENDING_REVIEW: "À valider",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  FAILED: "Échec",
};

export default function AdminGenerationsPage() {
  const [gens, setGens] = useState<Generation[]>([]);
  const [provider, setProvider] = useState("GOETHE");
  const [level, setLevel] = useState("B1");
  const [section, setSection] = useState("LESEN");
  // Situation d'ecoute : n'a de sens qu'en Hören, et c'est elle qui bascule la
  // generation vers un dialogue multi-voix.
  const [situation, setSituation] = useState("ALLTAG");
  const [taskFormat, setTaskFormat] = useState("MCQ_SINGLE");
  const [theme, setTheme] = useState("");
  const [itemCount, setItemCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/generations");
    if (res.ok) {
      const data: { generations: Generation[] } = await res.json();
      setGens(data.generations);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, level, section, taskFormat, theme, itemCount, ...(section === "HOEREN" ? { situation } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Génération impossible (clé IA configurée ?)");
      return;
    }
    setMsg("Génération terminée — relisez le contenu puis validez ou rejetez.");
    setTheme("");
    void load();
  }

  async function review(id: string, decision: "approve" | "reject") {
    let reason: string | undefined;
    if (decision === "reject") {
      reason = window.prompt("Motif du rejet (min. 3 caractères) :") ?? undefined;
      if (!reason || reason.length < 3) return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/generations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(decision === "approve" ? { decision } : { decision, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Action impossible");
      return;
    }
    void load();
  }

  async function enqueueTts(passageId: string) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/audio-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "passage", targetId: passageId }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Lancement TTS impossible");
      return;
    }
    setMsg("Job TTS en file — le worker générera l'audio.");
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Générations IA (Lesen / Hören)</h1>
      <p className="text-sm text-muted-foreground">
        L&apos;IA génère un passage + questions ancrés sur la bibliothèque RAG (anti-copie
        automatique). Rien n&apos;est visible des candidats avant votre validation.
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">Nouvelle génération</CardTitle>
          <CardDescription>Le thème guide la recherche RAG et la rédaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={generate} className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="g-provider">Examen</Label>
              <select id="g-provider" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-level">Niveau</Label>
              <select id="g-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-section">Compétence</Label>
              <select id="g-section" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>
                {SECTIONS_RECEPTIVE.map((s) => (
                  <option key={s} value={s}>{s === "LESEN" ? "Lesen" : "Hören"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-format">Format</Label>
              <select id="g-format" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={taskFormat} onChange={(e) => setTaskFormat(e.target.value)}>
                {TASK_FORMATS.map((f) => (
                  <option key={f} value={f}>{TASK_FORMAT_LABELS[f] ?? f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-count">Nb questions</Label>
              <Input id="g-count" type="number" min={1} max={15} value={itemCount} onChange={(e) => setItemCount(Number(e.target.value))} />
            </div>
            {/* Le décor n'apparaît qu'en Hören : c'est lui qui détermine
                combien de personnes parlent, donc combien de voix distinctes
                seront distribuées. */}
            {section === "HOEREN" ? (
              <div className="col-span-2 space-y-1 md:col-span-3">
                <Label htmlFor="g-situation">Situation d&apos;écoute</Label>
                <select
                  id="g-situation"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                >
                  {SITUATIONS.map((s) => (
                    <option key={s.cle} value={s.cle}>
                      {s.libelle} — {s.locuteurs.min === s.locuteurs.max
                        ? `${s.locuteurs.min} voix`
                        : `${s.locuteurs.min} à ${s.locuteurs.max} voix`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Chaque personnage reçoit une voix distincte. L&apos;audio n&apos;est pas généré
                  ici : il se lance depuis le passage, une fois le dialogue relu.
                </p>
              </div>
            ) : null}
            <div className="col-span-2 space-y-1 md:col-span-3">
              <Label htmlFor="g-theme">Thème</Label>
              <Input id="g-theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="ex. : la vie quotidienne en colocation" required minLength={3} maxLength={200} />
            </div>
            <Button type="submit" className="col-span-2 md:col-span-3" disabled={busy}>
              {busy ? "Génération en cours..." : "Générer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {gens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune génération pour le moment.</p>
        ) : (
          LEVELS.map((lvl) => {
            const group = gens.filter((g) => g.level === lvl);
            if (group.length === 0) return null;
            const firstLevel = LEVELS.find((l) => gens.some((g) => g.level === l));
            return (
              <LevelGroup key={lvl} level={lvl} count={group.length} defaultOpen={lvl === firstLevel}>
                {([
                  { key: "lesson", label: "Leçons" },
                  { key: "passage", label: "Passages" },
                ] as const).map(({ key, label }) => {
                  const sub = group.filter((g) => g.targetType === key);
                  if (sub.length === 0) return null;
                  return (
                    <SubGroup key={key} label={label} count={sub.length}>
                {sub.map((g) => (
            <Card key={g.id} className={g.status === "PENDING_REVIEW" ? "border-amber-300" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {g.targetType === "lesson" ? "📚 " : ""}
                    {g.passage?.title ?? g.lesson?.title ?? `${g.targetType} ${g.level}`}
                    {g.lesson ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        (leçon · {g.lesson.course.title})
                      </span>
                    ) : null}
                  </CardTitle>
                  <span className="text-sm font-medium">{STATUS_LABEL[g.status] ?? g.status}</span>
                </div>
                <CardDescription>
                  {[g.provider, g.level, g.section, g.taskFormat ? TASK_FORMAT_LABELS[g.taskFormat] : null]
                    .filter(Boolean)
                    .join(" · ")}
                  {g.similarityMax !== null ? ` · similarité max ${(g.similarityMax * 100).toFixed(0)} %` : ""}
                  {" · "}
                  {new Date(g.createdAt).toLocaleString("fr-FR")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.rejectReason ? (
                  <p className="text-sm text-destructive">Rejet : {g.rejectReason}</p>
                ) : null}

                {g.passage || g.lesson ? (
                  <>
                    <button
                      type="button"
                      className="text-sm underline"
                      onClick={() => setOpen(open === g.id ? null : g.id)}
                    >
                      {open === g.id
                        ? "Masquer le contenu"
                        : `Voir le contenu (${g.passage ? `${g.passage.questions.length} questions` : `${g.lesson?.exercises.length ?? 0} exercices`})`}
                    </button>
                    {open === g.id ? (
                      <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                        <p className="whitespace-pre-wrap">{g.passage?.body ?? g.lesson?.contentMd}</p>
                        <ol className="list-decimal space-y-1 pl-5">
                          {(g.passage?.questions ?? g.lesson?.exercises ?? []).map((q) => (
                            <li key={q.id}>{q.prompt}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {g.lesson ? (
                    <Link
                      href={`/admin/lessons/${g.lesson.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Modifier la leçon
                    </Link>
                  ) : null}
                  {g.passage ? (
                    <Link
                      href={`/admin/passages/${g.passage.id}/edit`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Modifier le passage
                    </Link>
                  ) : null}
                  {g.status === "PENDING_REVIEW" ? (
                    <>
                      <Button size="sm" onClick={() => review(g.id, "approve")} disabled={busy}>
                        Approuver et publier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review(g.id, "reject")} disabled={busy}>
                        Rejeter
                      </Button>
                    </>
                  ) : null}
                  {g.status === "APPROVED" && g.section === "HOEREN" && g.passage && !g.passage.audioPath ? (
                    <Button size="sm" variant="outline" onClick={() => enqueueTts(g.passage!.id)} disabled={busy}>
                      Générer l&apos;audio (TTS)
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
                ))}
                    </SubGroup>
                  );
                })}
              </LevelGroup>
            );
          })
        )}
      </div>
    </main>
  );
}
