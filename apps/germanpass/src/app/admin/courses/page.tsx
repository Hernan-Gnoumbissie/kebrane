"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEVELS, COURSE_KINDS, COURSE_KIND_LABELS } from "@/lib/content-enums";
import { LevelGroup, SubGroup } from "@/components/level-group";

type Lesson = { id: string; title: string; status: string; position: number };
type Course = {
  id: string;
  level: string;
  kind: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
};

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  // Cours
  const [cLevel, setCLevel] = useState("A1");
  const [cKind, setCKind] = useState("GRAMMAR");
  const [cTitle, setCTitle] = useState("");
  const [cDescription, setCDescription] = useState("");
  // Leçon
  const [lCourseId, setLCourseId] = useState("");
  const [lTitle, setLTitle] = useState("");
  const [lContent, setLContent] = useState("");
  const [lPosition, setLPosition] = useState(0);
  const [lPublish, setLPublish] = useState(true);
  // Génération IA
  const [gCourseId, setGCourseId] = useState("");
  const [gTitle, setGTitle] = useState("");
  const [gLernziel, setGLernziel] = useState("");
  const [gCount, setGCount] = useState(5);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/courses");
    if (res.ok) {
      const data: { courses: Course[] } = await res.json();
      setCourses(data.courses);
      if (data.courses[0] && !lCourseId) setLCourseId(data.courses[0].id);
      if (data.courses[0] && !gCourseId) setGCourseId(data.courses[0].id);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCourse(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: cLevel,
        kind: cKind,
        title: cTitle,
        ...(cDescription ? { description: cDescription } : {}),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr("Création du chapitre impossible");
      return;
    }
    setMsg("Chapitre créé.");
    setCTitle("");
    setCDescription("");
    void load();
  }

  async function createLesson(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: lCourseId,
        title: lTitle,
        contentMd: lContent,
        position: lPosition,
        publish: lPublish,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Création de la leçon impossible");
      return;
    }
    setMsg(`Leçon créée${lPublish ? " et publiée" : " (brouillon)"}. Les exercices peuvent être ajoutés via l'API.`);
    setLTitle("");
    setLContent("");
    void load();
  }

  async function generateAiLesson(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/lessons/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: gCourseId,
        title: gTitle,
        lernziel: gLernziel,
        exerciseCount: gCount,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Génération impossible (clé IA configurée ?)");
      return;
    }
    setMsg(
      "Leçon générée — relisez-la et validez-la dans « Générations IA » pour la publier."
    );
    setGTitle("");
    setGLernziel("");
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Chapitres &amp; leçons</h1>
      <p className="text-sm text-muted-foreground">
        Curriculum A1→C2 (grammaire, vocabulaire, Redemittel). Les leçons sont en Markdown
        bilingue ; un chapitre est validé à ≥ 70 % au mini-test.
      </p>

      {msg ? <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{msg}</p> : null}
      {err ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-destructive">{err}</p> : null}

      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="text-base">✨ Générer une leçon par IA</CardTitle>
          <CardDescription>
            Donnez un titre et un Lernziel — l&apos;IA rédige la leçon complète (explications FR,
            exemples DE, tableaux) et ses exercices auto-corrigés. Rien n&apos;est publié avant
            votre validation dans « Générations IA ».
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={generateAiLesson} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_2fr_110px]">
              <div className="space-y-1">
                <Label htmlFor="g-course">Chapitre</Label>
                <select
                  id="g-course"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={gCourseId}
                  onChange={(e) => setGCourseId(e.target.value)}
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.level} · {COURSE_KIND_LABELS[c.kind] ?? c.kind} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-title">Titre de la leçon</Label>
                <Input
                  id="g-title"
                  value={gTitle}
                  onChange={(e) => setGTitle(e.target.value)}
                  placeholder="ex. : Le datif après les prépositions"
                  required
                  minLength={3}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="g-count">Exercices</Label>
                <Input id="g-count" type="number" min={3} max={10} value={gCount} onChange={(e) => setGCount(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="g-lernziel">Lernziel (objectif d&apos;apprentissage)</Label>
              <textarea
                id="g-lernziel"
                className="min-h-20 w-full rounded-md border bg-background p-3 text-sm"
                value={gLernziel}
                onChange={(e) => setGLernziel(e.target.value)}
                placeholder="ex. : savoir utiliser le datif après aus, bei, mit, nach, seit, von, zu dans des phrases du quotidien"
                required
                minLength={5}
                maxLength={500}
              />
            </div>
            <Button type="submit" disabled={busy || courses.length === 0}>
              {busy ? "Génération en cours (≈ 30 s)..." : "✨ Générer la leçon"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouveau chapitre</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="c-level">Niveau</Label>
                  <select id="c-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cLevel} onChange={(e) => setCLevel(e.target.value)}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-kind">Type</Label>
                  <select id="c-kind" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cKind} onChange={(e) => setCKind(e.target.value)}>
                    {COURSE_KINDS.map((k) => (
                      <option key={k} value={k}>{COURSE_KIND_LABELS[k] ?? k}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-title">Titre</Label>
                <Input id="c-title" value={cTitle} onChange={(e) => setCTitle(e.target.value)} required minLength={3} maxLength={200} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="c-desc">Description (opt.)</Label>
                <Input id="c-desc" value={cDescription} onChange={(e) => setCDescription(e.target.value)} maxLength={1000} />
              </div>
              <Button type="submit" disabled={busy}>
                Créer le chapitre
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle leçon (manuelle)</CardTitle>
            <CardDescription>Markdown en allemand niveaugerecht (l&apos;aide FR/EN peut être ajoutée via l&apos;API ou la génération IA).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createLesson} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="l-course">Chapitre</Label>
                <select id="l-course" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={lCourseId} onChange={(e) => setLCourseId(e.target.value)} required>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.level} · {COURSE_KIND_LABELS[c.kind] ?? c.kind} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-[1fr_110px] gap-4">
                <div className="space-y-1">
                  <Label htmlFor="l-title">Titre</Label>
                  <Input id="l-title" value={lTitle} onChange={(e) => setLTitle(e.target.value)} required minLength={3} maxLength={200} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="l-pos">Position</Label>
                  <Input id="l-pos" type="number" min={0} value={lPosition} onChange={(e) => setLPosition(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="l-content">Contenu (Markdown)</Label>
                <textarea
                  id="l-content"
                  className="min-h-36 w-full rounded-md border bg-background p-3 font-mono text-sm"
                  value={lContent}
                  onChange={(e) => setLContent(e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={lPublish} onChange={(e) => setLPublish(e.target.checked)} />
                Publier immédiatement
              </label>
              <Button type="submit" disabled={busy || courses.length === 0}>
                Créer la leçon
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun chapitre pour le moment.</p>
        ) : (
          LEVELS.map((lvl) => {
            const group = courses.filter((c) => c.level === lvl);
            if (group.length === 0) return null;
            const firstLevel = LEVELS.find((l) => courses.some((c) => c.level === l));
            return (
              <LevelGroup key={lvl} level={lvl} count={group.length} defaultOpen={lvl === firstLevel}>
                {COURSE_KINDS.map((k) => {
                  const sub = group.filter((c) => c.kind === k);
                  if (sub.length === 0) return null;
                  return (
                    <SubGroup key={k} label={COURSE_KIND_LABELS[k] ?? k} count={sub.length}>
                {sub.map((c) => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {c.title}
                      </CardTitle>
                      {c.description ? <CardDescription>{c.description}</CardDescription> : null}
                    </CardHeader>
                    <CardContent>
                      {c.lessons.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune leçon.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {c.lessons.map((l) => (
                            <li key={l.id} className="flex items-center justify-between rounded-md border p-2">
                              <span>
                                {l.position + 1}. {l.title}
                              </span>
                              <span className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  {l.status === "PUBLISHED" ? "Publiée" : l.status === "ARCHIVED" ? "Archivée" : "Brouillon"}
                                </span>
                                <Link href={`/admin/lessons/${l.id}/edit`} className="text-sm underline">
                                  Éditer
                                </Link>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
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
