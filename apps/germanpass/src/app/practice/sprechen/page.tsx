"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelSelector } from "@/components/LevelSelector";

type Task = {
  id: string;
  provider: string;
  level: string;
  partNumber: number;
  title: string;
  instructions: string;
  prepTimeSec: number;
  speakTimeSec: number;
  stimulusImageUrl: string | null;
};

type Submission = {
  id: string;
  status: string;
  transcript: string | null;
  scores: {
    taskAchievement: number;
    vocabulary: number;
    grammar: number;
    fluencyEstimate: number;
    totalIndicative: number;
    estimatedLevel: string;
  } | null;
  feedback: {
    lang: "fr" | "en";
    annotatedTranscript: string;
    metrics: { wpm: number; repetitionRatio: number; hesitationCount: number };
    errors: { type: string; excerpt: string; correction: string; explanationDe: string; explanationNative: string }[];
    recommendationsDe: string[];
    recommendationsNative: string[];
    summaryDe: string;
    summaryNative: string;
  } | null;
  error: string | null;
};

const PROVIDERS = ["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"] as const;
type Phase = "setup" | "prep" | "recording" | "uploading" | "waiting" | "done";

function scoreMessage(pct: number): string {
  if (pct >= 90) return "Performance exceptionnelle ! Tu es prêt(e) pour le niveau suivant.";
  if (pct >= 70) return "Excellent résultat ! Tu maîtrises bien ce niveau.";
  if (pct >= 50) return "Bon travail ! Tu progresses bien, continue sur ta lancée.";
  return "Ne te décourage pas, chaque essai compte ! Analyse tes erreurs et réessaie.";
}

export default function SprechenPage() {
  const [provider, setProvider] = useState<string>("GOETHE");
  const [level, setLevel] = useState<string>("B1");
  const [task, setTask] = useState<Task | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(0);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null); // null = chargement
  const [showNative, setShowNative] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [targetLevel, setTargetLevel] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Objectif déclaré : examen + niveau par défaut
    void fetch("/api/account/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile: { targetProvider: string | null; targetLevel: string | null; currentLevel: string | null } } | null) => {
        if (data?.profile.targetProvider) setProvider(data.profile.targetProvider);
        if (data?.profile.currentLevel) setCurrentLevel(data.profile.currentLevel);
        if (data?.profile.targetLevel) {
          setTargetLevel(data.profile.targetLevel);
          setLevel(data.profile.targetLevel);
        } else if (data?.profile.currentLevel) {
          setLevel(data.profile.currentLevel);
        }
      })
      .catch(() => undefined);

    // Vérifie le consentement existant pour ne pas redemander inutilement
    void fetch("/api/account/consent")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { audioConsent: boolean } | null) => {
        setConsented(data?.audioConsent ?? false);
      })
      .catch(() => setConsented(false));

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function giveConsent() {
    const res = await fetch("/api/account/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioConsent: true }),
    });
    if (res.ok) setConsented(true);
  }

  async function loadTask() {
    setErr(null);
    setSubmission(null);
    const res = await fetch(`/api/speaking/tasks?provider=${provider}&level=${level}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error?.message ?? "Aucune tâche disponible");
      return;
    }
    setTask(data.task);
    startPrep(data.task as Task);
  }

  function startPrep(t: Task) {
    setPhase("prep");
    setCountdown(t.prepTimeSec);
    if (timerRef.current) clearInterval(timerRef.current);
    if (t.prepTimeSec === 0) {
      void startRecording(t);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void startRecording(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function startRecording(t: Task) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void upload(t);
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setPhase("recording");
      setCountdown(t.speakTimeSec);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            stopRecording();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      setErr("Microphone inaccessible — vérifiez les permissions du navigateur.");
      setPhase("setup");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function upload(t: Task) {
    setPhase("uploading");
    const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const form = new FormData();
    form.set("audio", blob, "speech.webm");
    form.set("speakingTaskId", t.id);
    form.set("durationSec", String(durationSec));
    const res = await fetch("/api/speaking/submissions", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error?.message ?? "Envoi impossible");
      setPhase("setup");
      return;
    }
    setPhase("waiting");
    pollRef.current = setInterval(() => void poll(data.submissionId as string), 10_000);
  }

  async function poll(id: string) {
    const res = await fetch(`/api/speaking/submissions/${id}`);
    if (!res.ok) return;
    const data: { submission: Submission } = await res.json();
    if (data.submission.status === "COMPLETED" || data.submission.status === "FAILED") {
      if (pollRef.current) clearInterval(pollRef.current);
      setSubmission(data.submission);
      setPhase("done");
      if (data.submission.status === "FAILED") {
        setErr("L'évaluation a échoué. Réessayez plus tard.");
      }
    }
  }

  return (
    <main className="container max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Entraînement Sprechen</h1>
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        L&apos;évaluation de la prononciation est approximative ; la note orale est indicative.
      </p>

      {consented === null ? (
        /* Chargement du statut de consentement */
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Vérification des paramètres…
        </div>
      ) : !consented ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consentement d&apos;enregistrement (RGPD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Votre voix sera enregistrée, transcrite et évaluée par IA. Vous pouvez révoquer ce
              consentement à tout moment depuis votre compte.
            </p>
            <Button onClick={() => void giveConsent()}>J&apos;accepte l&apos;enregistrement audio</Button>
          </CardContent>
        </Card>
      ) : phase === "setup" ? (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4 pt-6">
            <div>
              <p className="mb-1 text-sm font-medium">Examen</p>
              <select aria-label="Examen" className="rounded-md border p-2" value={provider} onChange={(e) => setProvider(e.target.value)}>
                {PROVIDERS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Niveau</p>
              <LevelSelector
                currentLevel={currentLevel}
                targetLevel={targetLevel}
                selected={level}
                onChange={setLevel}
              />
            </div>
            <Button onClick={() => void loadTask()}>Démarrer une tâche</Button>
          </CardContent>
        </Card>
      ) : null}

      {task && phase !== "setup" ? (
        <Card>
          <CardHeader>
            <CardTitle>{task.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {task.provider} {task.level} · Partie {task.partNumber} · Préparation {task.prepTimeSec}s ·
              Parole {task.speakTimeSec}s
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm">{task.instructions}</p>
            {task.stimulusImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={task.stimulusImageUrl} alt="Support visuel de la tâche" className="max-h-80 rounded-md border" />
            ) : null}

            {phase === "prep" ? (
              <p className="flex items-center gap-2 text-lg font-bold" role="timer">
                <Clock aria-hidden="true" className="h-5 w-5" />
                Préparation : {countdown}s
              </p>
            ) : null}
            {phase === "recording" ? (
              <div className="space-y-2">
                <p
                  className="flex items-center gap-2 text-lg font-bold text-destructive"
                  role="timer"
                >
                  {/* Le point pulsant est la convention universelle de
                      l'enregistrement en cours. `motion-safe` : il s'arrête
                      pour qui demande moins d'animations. */}
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 shrink-0 rounded-full bg-destructive motion-safe:animate-pulse"
                  />
                  Enregistrement : {countdown}s restantes
                </p>
                <Button variant="destructive" onClick={() => stopRecording()}>
                  Arrêter et envoyer
                </Button>
              </div>
            ) : null}
            {phase === "uploading" ? <p className="text-sm">Envoi de l&apos;audio…</p> : null}
            {phase === "waiting" ? (
              <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-sm text-foreground flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-info" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <div>
                  <p className="font-semibold">Évaluation en cours…</p>
                  <p className="mt-0.5">
                    Votre production est en cours d&apos;évaluation par notre IA. Le résultat sera disponible sous 1 à
                    2 minutes. Vous pouvez continuer à vous entraîner pendant ce temps.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {submission?.status === "COMPLETED" && submission.scores && submission.feedback ? (
        <>
          <div className="flex items-center gap-2 text-sm" role="group" aria-label="Langue du feedback">
            <span className="text-muted-foreground">Feedback :</span>
            <Button size="sm" variant={!showNative ? "default" : "outline"} onClick={() => setShowNative(false)}>
              Deutsch
            </Button>
            <Button size="sm" variant={showNative ? "default" : "outline"} onClick={() => setShowNative(true)}>
              {submission.feedback.lang === "en" ? "English" : "Français"}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Note indicative : {submission.scores.totalIndicative}/40 — niveau estimé{" "}
                {submission.scores.estimatedLevel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">
                {scoreMessage(Math.round((submission.scores.totalIndicative / 40) * 100))}
              </p>
              <p lang={showNative ? submission.feedback.lang : "de"}>
                {showNative ? submission.feedback.summaryNative : submission.feedback.summaryDe}
              </p>
              <ul className="grid grid-cols-2 gap-2">
                <li>Tâche : {submission.scores.taskAchievement}/10</li>
                <li>Lexique : {submission.scores.vocabulary}/10</li>
                <li>Grammaire : {submission.scores.grammar}/10</li>
                <li>Fluidité (estimée) : {submission.scores.fluencyEstimate}/10</li>
              </ul>
              <p className="text-muted-foreground">
                {submission.feedback.metrics.wpm} mots/min · {submission.feedback.metrics.hesitationCount}{" "}
                hésitations · répétitions {Math.round(submission.feedback.metrics.repetitionRatio * 100)} %
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transcription annotée</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm" lang="de">
                {submission.feedback.annotatedTranscript}
              </p>
            </CardContent>
          </Card>

          {submission.feedback.errors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Corrections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {submission.feedback.errors.map((e, i) => (
                  <div key={i} className="rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-warning">{e.type}</p>
                    <p>
                      <s>{e.excerpt}</s> → <strong lang="de">{e.correction}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      {showNative ? e.explanationNative : e.explanationDe}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {submission.feedback.recommendationsDe.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recommandations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {(showNative
                    ? submission.feedback.recommendationsNative
                    : submission.feedback.recommendationsDe
                  ).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Button onClick={() => setPhase("setup")}>Nouvelle tâche</Button>
        </>
      ) : null}

      {err ? (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      ) : null}
    </main>
  );
}
