"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Check, CheckCircle2, ChevronDown, ChevronUp, Mic, Square, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCard } from "@/components/ui/choice-card";
import { HandwritingImport } from "@/components/HandwritingImport";
import { cn } from "@/lib/utils";

type ExamListItem = {
  id: string;
  title: string;
  provider: string;
  level: string;
  sections?: { section: string; durationMin: number }[];
};

type SanQuestion = {
  id: string;
  taskFormat: string;
  prompt: string;
  options: { id: string; text: string }[];
  clientMetadata: {
    left?: { leftId: string; text: string }[];
    right?: { rightId: string; text: string }[];
    textWithGaps?: string;
    gapIds?: string[];
    items?: { itemId: string; text: string }[];
  } | null;
};

type SectionData = {
  attemptId: string;
  section: string;
  deadline: string;
  passages: { id: string; title: string; body: string | null; audioUrl: string | null; maxListens: number; questions: SanQuestion[] }[];
  writingPrompts: { id: string; taskNumber: number; title: string; instructions: string; minWords: number | null; maxWords: number | null }[];
  speakingTasks: { id: string; partNumber: number; title: string; instructions: string; prepTimeSec: number; speakTimeSec: number }[];
};

type Report = {
  examTitle: string;
  pendingEvaluations: boolean;
  result: {
    totalPct: number;
    verdict: string;
    detail: string;
    perSection: { section: string; pct: number; passed: boolean | null; tdn?: string | null }[];
  };
  previousAttempts: { id: string; submittedAt: string; scores: { totalPct?: number; verdict?: string } | null }[];
};

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true); // spinner liste initiale
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [data, setData] = useState<SectionData | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [writings, setWritings] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const pollReportRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [target, setTarget] = useState<{ provider: string | null; level: string | null }>({
    provider: null,
    level: null,
  });

  useEffect(() => {
    void Promise.all([
      fetch("/api/exams")
        .then((r) => r.json())
        .then((d: { exams?: ExamListItem[] }) => setExams(d.exams ?? []))
        .catch(() => undefined),
      fetch("/api/account/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { profile: { targetProvider: string | null; targetLevel: string | null } } | null) => {
          if (data) setTarget({ provider: data.profile.targetProvider, level: data.profile.targetLevel });
        })
        .catch(() => undefined),
    ]).finally(() => setLoadingList(false));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollReportRef.current) clearInterval(pollReportRef.current);
    };
  }, []);

  const hasTarget = Boolean(target.provider || target.level);
  const matchesTarget = (e: ExamListItem) =>
    (!target.provider || e.provider === target.provider) && (!target.level || e.level === target.level);
  const recommended = hasTarget ? exams.filter(matchesTarget) : exams;
  const others = hasTarget ? exams.filter((e) => !matchesTarget(e)) : [];

  function armTimer(deadline: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !submittingRef.current) {
        void submitSection(true);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }

  async function loadCurrent(aId: string) {
    const res = await fetch(`/api/exams/attempts/${aId}/current`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(d.error?.message ?? "Chargement impossible");
      return;
    }
    setData(d as SectionData);
    setResponses({});
    setWritings({});
    armTimer((d as SectionData).deadline);
  }

  async function start(examId: string) {
    setBusy(true);
    setErr(null);
    setReport(null);
    const res = await fetch(`/api/exams/${examId}/attempts`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 409 && d.attemptId) {
      setAttemptId(d.attemptId);
      await loadCurrent(d.attemptId);
      return;
    }
    if (!res.ok) {
      setErr(d.error?.message ?? "Démarrage impossible");
      return;
    }
    setAttemptId(d.attemptId);
    await loadCurrent(d.attemptId);
  }

  async function submitSection(auto = false) {
    if (!attemptId || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const answers = Object.entries(responses).map(([questionId, response]) => ({ questionId, response }));
    const writingPayload = Object.entries(writings).map(([writingPromptId, text]) => ({ writingPromptId, text }));
    const res = await fetch(`/api/exams/attempts/${attemptId}/submit-section`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, writings: writingPayload, auto }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    submittingRef.current = false;
    if (!res.ok) {
      if (d.error?.code === "DEADLINE_PASSED") {
        void submitSection(true);
        return;
      }
      setErr(d.error?.message ?? "Soumission impossible");
      return;
    }
    if (d.finished) {
      setData(null);
      await loadReport(attemptId);
      return;
    }
    await loadCurrent(attemptId);
  }

  async function loadReport(aId: string) {
    const res = await fetch(`/api/exams/attempts/${aId}/report`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const r = d as Report;
    setReport(r);
    // Si des évaluations IA sont encore en cours, on poll toutes les 10 s
    if (r.pendingEvaluations) {
      if (pollReportRef.current) clearInterval(pollReportRef.current);
      pollReportRef.current = setInterval(async () => {
        const res2 = await fetch(`/api/exams/attempts/${aId}/report`);
        if (!res2.ok) return;
        const r2 = await res2.json() as Report;
        setReport(r2);
        if (!r2.pendingEvaluations && pollReportRef.current) {
          clearInterval(pollReportRef.current);
          pollReportRef.current = null;
        }
      }, 10_000);
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  function renderQuestion(q: SanQuestion) {
    const current = responses[q.id];
    return (
      <div key={q.id} className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">{q.prompt}</p>

        {(q.taskFormat === "MCQ_SINGLE" || q.taskFormat === "MCQ_MULTI") &&
          q.options.map((o) => {
            const sel = (current as { optionIds?: string[] })?.optionIds ?? [];
            const checked = sel.includes(o.id);
            return (
              <ChoiceCard
                key={o.id}
                type={q.taskFormat === "MCQ_SINGLE" ? "radio" : "checkbox"}
                name={q.id}
                checked={checked}
                onChange={() => {
                  const next =
                    q.taskFormat === "MCQ_SINGLE" ? [o.id] : checked ? sel.filter((x) => x !== o.id) : [...sel, o.id];
                  setResponses((r) => ({ ...r, [q.id]: { optionIds: next } }));
                }}
              >
                {o.text}
              </ChoiceCard>
            );
          })}

        {q.taskFormat === "TRUE_FALSE" &&
          [
            { label: "Richtig", value: true },
            { label: "Falsch", value: false },
          ].map((opt) => (
            <ChoiceCard
              key={opt.label}
              type="radio"
              name={q.id}
              checked={(current as { value?: boolean })?.value === opt.value}
              onChange={() => setResponses((r) => ({ ...r, [q.id]: { value: opt.value } }))}
            >
              {opt.label}
            </ChoiceCard>
          ))}

        {q.taskFormat === "MATCHING" &&
          q.clientMetadata?.left?.map((l) => {
            const pairs = (current as { pairs?: { leftId: string; rightId: string }[] })?.pairs ?? [];
            return (
              <div key={l.leftId} className="flex items-center gap-2 text-sm">
                <span className="min-w-40">{l.text}</span>
                <Select
                  aria-label={`Correspondance pour ${l.text}`}
                  className="max-w-64"
                  value={pairs.find((p) => p.leftId === l.leftId)?.rightId ?? ""}
                  onChange={(e) => {
                    const next = pairs.filter((p) => p.leftId !== l.leftId);
                    if (e.target.value) next.push({ leftId: l.leftId, rightId: e.target.value });
                    setResponses((r) => ({ ...r, [q.id]: { pairs: next } }));
                  }}
                >
                  <option value="">—</option>
                  {q.clientMetadata?.right?.map((rt) => (
                    <option key={rt.rightId} value={rt.rightId}>
                      {rt.text}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}

        {q.taskFormat === "GAP_FILL" && (
          <div className="space-y-1">
            {q.clientMetadata?.textWithGaps ? (
              <p className="text-sm text-muted-foreground">{q.clientMetadata.textWithGaps}</p>
            ) : null}
            {q.clientMetadata?.gapIds?.map((gapId, i) => {
              const gaps = (current as { gaps?: { gapId: string; value: string }[] })?.gaps ?? [];
              return (
                <div key={gapId} className="flex items-center gap-2 text-sm">
                  <span>({i + 1})</span>
                  <Input
                    className="h-8 max-w-48"
                    value={gaps.find((g) => g.gapId === gapId)?.value ?? ""}
                    onChange={(e) => {
                      const next = gaps.filter((g) => g.gapId !== gapId);
                      next.push({ gapId, value: e.target.value });
                      setResponses((r) => ({ ...r, [q.id]: { gaps: next } }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {q.taskFormat === "ORDERING" && q.clientMetadata?.items ? (
          <OrderingInline
            items={q.clientMetadata.items}
            onChange={(order) => setResponses((r) => ({ ...r, [q.id]: { order } }))}
          />
        ) : null}
      </div>
    );
  }

  return (
    <main className="container max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Examens blancs</h1>

      {!data && !report ? (
        <div className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Chargement des examens…
            </div>
          ) : exams.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
              <p className="text-muted-foreground">Aucun examen publié pour le moment.</p>
              <p className="text-sm text-muted-foreground">
                En attendant, entraînez-vous par compétence.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <a href="/practice" className="text-sm underline">Lesen/Hören</a>
                <a href="/practice/schreiben" className="text-sm underline">Schreiben</a>
                <a href="/practice/sprechen" className="text-sm underline">Sprechen</a>
              </div>
            </div>
          ) : null}
          {hasTarget && exams.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Votre objectif : {target.provider ?? "tout examen"} {target.level ?? ""}. Modifiable
              depuis Mon compte.
            </p>
          ) : null}
          {hasTarget && recommended.length === 0 && exams.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun examen publié ne correspond encore à votre objectif.
            </p>
          ) : null}
          {recommended.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {e.provider} {e.level} ·{" "}
                  {e.sections?.map((s) => `${s.section} ${s.durationMin}min`).join(" · ")}
                </p>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void start(e.id)} disabled={busy}>
                  Commencer (conditions réelles)
                </Button>
              </CardContent>
            </Card>
          ))}
          {others.length > 0 ? (
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Autres examens, hors de votre objectif ({others.length})
              </summary>
              <div className="mt-3 space-y-3">
                {others.map((e) => (
                  <Card key={e.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{e.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {e.provider} {e.level} ·{" "}
                        {e.sections?.map((s) => `${s.section} ${s.durationMin}min`).join(" · ")}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" onClick={() => void start(e.id)} disabled={busy}>
                        Commencer quand même
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between rounded-md border bg-background p-3 shadow-sm">
            <span className="font-bold">{data.section}</span>
            <span className={secondsLeft < 120 ? "font-bold text-destructive" : "font-medium"} role="timer">
              ⏱ {mm}:{String(ss).padStart(2, "0")}
            </span>
          </div>

          {data.passages.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.body ? <p className="whitespace-pre-wrap text-sm">{p.body}</p> : null}
                {p.audioUrl ? <ExamAudio attemptId={data.attemptId} url={p.audioUrl} maxListens={p.maxListens} /> : null}
                {p.questions.map(renderQuestion)}
              </CardContent>
            </Card>
          ))}

          {data.writingPrompts.map((wp) => (
            <Card key={wp.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Aufgabe {wp.taskNumber} : {wp.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {wp.minWords ?? "—"}–{wp.maxWords ?? "—"} mots
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap text-sm">{wp.instructions}</p>
                <HandwritingImport
                  onTranscribed={(t) =>
                    setWritings((w) => ({ ...w, [wp.id]: (w[wp.id] ? w[wp.id] + "\n" : "") + t }))
                  }
                />
                <Textarea
                  aria-label={`Production écrite tâche ${wp.taskNumber}`}
                  className="min-h-48"
                  value={writings[wp.id] ?? ""}
                  onChange={(e) => setWritings((w) => ({ ...w, [wp.id]: e.target.value }))}
                />
              </CardContent>
            </Card>
          ))}

          {data.speakingTasks.map((st) => (
            <Card key={st.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Teil {st.partNumber} : {st.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Préparation {st.prepTimeSec}s · Parole {st.speakTimeSec}s
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="whitespace-pre-wrap text-sm">{st.instructions}</p>
                <ExamRecorder attemptId={data.attemptId} taskId={st.id} maxSec={st.speakTimeSec} />
              </CardContent>
            </Card>
          ))}

          <Button size="lg" onClick={() => void submitSection(false)} disabled={busy}>
            {busy ? "Soumission..." : "Terminer cette épreuve →"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Pas de retour arrière possible. Soumission automatique à expiration du temps.
          </p>
        </>
      ) : null}

      {report ? (
        <Card
          className={cn(
            report.result.verdict === "bestanden" && "border-success/60",
            report.result.verdict === "tdn" && "border-info/60",
            report.result.verdict !== "bestanden" &&
              report.result.verdict !== "tdn" &&
              "border-destructive/60"
          )}
        >
          <CardHeader>
            {/* Le verdict est le seul endroit de l'app ou la couleur porte un
                enjeu emotionnel. L'icone l'accompagne, le texte le dit. */}
            <CardTitle className="flex items-center gap-2">
              {report.result.verdict === "tdn" ? (
                <BarChart3 aria-hidden="true" className="h-5 w-5 text-info" />
              ) : report.result.verdict === "bestanden" ? (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-success" />
              ) : (
                <XCircle aria-hidden="true" className="h-5 w-5 text-destructive" />
              )}
              {report.result.verdict === "tdn"
                ? `Résultat TestDaF — ${report.result.totalPct} %`
                : `${report.result.verdict === "bestanden" ? "Bestanden" : "Nicht bestanden"} — ${report.result.totalPct} %`}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{report.result.detail}</p>
            {report.pendingEvaluations ? (
              <div className="flex items-center gap-2 text-sm text-warning">
                <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Évaluations IA (Schreiben/Sprechen) en cours — mise à jour automatique toutes les 10 s.
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-sm">
              {report.result.perSection.map((s) => (
                <li key={s.section} className="flex items-center gap-1.5">
                  <span>
                    {s.section} : {s.pct} %{s.tdn ? ` — ${s.tdn}` : ""}
                  </span>
                  {!s.tdn && s.passed !== null ? (
                    s.passed ? (
                      <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <X aria-hidden="true" className="h-3.5 w-3.5 text-destructive" />
                    )
                  ) : null}
                </li>
              ))}
            </ul>
            {report.previousAttempts.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Tentatives précédentes :</p>
                {report.previousAttempts.map((p) => (
                  <p key={p.id}>
                    {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("fr-FR") : "—"} :{" "}
                    {p.scores?.totalPct ?? "—"} % ({p.scores?.verdict ?? "—"})
                  </p>
                ))}
              </div>
            ) : null}
            <Button onClick={() => setReport(null)}>Retour aux examens</Button>
          </CardContent>
        </Card>
      ) : null}

      {err ? (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      ) : null}
    </main>
  );
}

function ExamAudio({ attemptId, url, maxListens }: { attemptId: string; url: string; maxListens: number }) {
  const [remaining, setRemaining] = useState(maxListens);
  async function listen() {
    const res = await fetch(`/api/practice/attempts/${attemptId}/listen`, { method: "POST" }).catch(() => null);
    // En mode examen, le décompte serveur est porté par l'attempt MOCK ; on joue localement
    void res;
    setRemaining((r) => Math.max(0, r - 1));
    const audio = document.getElementById(`audio-${url}`) as HTMLAudioElement | null;
    if (audio) {
      audio.currentTime = 0;
      void audio.play();
    }
  }
  return (
    <div className="space-y-1">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio id={`audio-${url}`} src={url} preload="none" />
      <Button size="sm" onClick={() => void listen()} disabled={remaining === 0}>
        ▶ Écouter ({remaining} restante·s)
      </Button>
    </div>
  );
}

function ExamRecorder({ attemptId, taskId, maxSec }: { attemptId: string; taskId: string; maxSec: number }) {
  const [state, setState] = useState<"idle" | "recording" | "sent" | "error">("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.set("audio", blob, "speech.webm");
        form.set("speakingTaskId", taskId);
        form.set("attemptId", attemptId);
        form.set("durationSec", String(Math.round((Date.now() - startRef.current) / 1000)));
        const res = await fetch("/api/speaking/submissions", { method: "POST", body: form });
        setState(res.ok ? "sent" : "error");
      };
      recRef.current = rec;
      startRef.current = Date.now();
      rec.start(1000);
      setState("recording");
      setTimeout(() => {
        if (recRef.current?.state === "recording") recRef.current.stop();
      }, maxSec * 1000);
    } catch {
      setState("error");
    }
  }

  if (state === "sent")
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <Check aria-hidden="true" className="h-4 w-4" />
        Enregistrement envoyé
      </p>
    );
  return (
    <div className="space-y-1">
      {state === "recording" ? (
        <Button size="sm" variant="destructive" onClick={() => recRef.current?.stop()}>
          <Square aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 fill-current" />
          Arrêter l&apos;enregistrement
        </Button>
      ) : (
        <Button size="sm" onClick={() => void startRec()}>
          <Mic aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Enregistrer ma réponse
        </Button>
      )}
      {state === "error" ? <p className="text-sm text-destructive">Micro inaccessible ou envoi échoué.</p> : null}
    </div>
  );
}

function OrderingInline({
  items,
  onChange,
}: {
  items: { itemId: string; text: string }[];
  onChange: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(items.map((i) => i.itemId));
  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const t = index + dir;
    if (t < 0 || t >= next.length) return;
    const a = next[index] as string;
    next[index] = next[t] as string;
    next[t] = a;
    setOrder(next);
    onChange(next);
  }
  return (
    <ol className="space-y-1">
      {order.map((id, i) => (
        <li key={id} className="flex items-center gap-3 rounded-md border p-2 text-sm">
          {/* Même traitement que dans /practice : le rang est affiché, et les
              flèches nomment l'élément qu'elles déplacent. */}
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
            {i + 1}
          </span>
          <span className="flex-1">{items.find((it) => it.itemId === id)?.text}</span>
          <div className="flex shrink-0 gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label={`Monter « ${items.find((it) => it.itemId === id)?.text ?? ""} »`}
            >
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9"
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              aria-label={`Descendre « ${items.find((it) => it.itemId === id)?.text ?? ""} »`}
            >
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
