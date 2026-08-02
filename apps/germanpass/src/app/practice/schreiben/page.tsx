"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelSelector } from "@/components/LevelSelector";
import { HandwritingImport } from "@/components/HandwritingImport";

type Prompt = {
  id: string;
  provider: string;
  level: string;
  title: string;
  instructions: string;
  minWords: number | null;
  maxWords: number | null;
  timeLimitMin: number;
};

type Feedback = {
  scores: {
    perCriterion: { key: string; score: number; max: number; commentDe: string; commentNative: string }[];
    totalPoints: number;
    maxPoints: number;
    estimatedLevel: string;
  };
  feedback: {
    lang: "fr" | "en";
    errors: { type: string; excerpt: string; correction: string; explanationDe: string; explanationNative: string }[];
    recommendationsDe: string[];
    recommendationsNative: string[];
    summaryDe: string;
    summaryNative: string;
  };
};

const PROVIDERS = ["GOETHE", "OSD", "TELC", "ECL", "TESTDAF"] as const;

function scoreMessage(pct: number): string {
  if (pct >= 90) return "🏆 Performance exceptionnelle ! Tu es prêt(e) pour le niveau suivant.";
  if (pct >= 70) return "Excellent résultat ! Tu maîtrises bien ce niveau.";
  if (pct >= 50) return "Bon travail ! Tu progresses bien, continue sur ta lancée.";
  return "Ne te décourage pas, chaque essai compte ! Analyse tes erreurs et réessaie.";
}

export default function SchreibenPage() {
  const [provider, setProvider] = useState<string>("GOETHE");
  const [level, setLevel] = useState<string>("B1");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [result, setResult] = useState<Feedback | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNative, setShowNative] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [targetLevel, setTargetLevel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  // Couleur du compteur selon les seuils
  const wordCountColor = (() => {
    if (!prompt) return "";
    const min = prompt.minWords ?? 0;
    const max = prompt.maxWords ?? Infinity;
    if (wordCount < min) return "text-amber-600 font-semibold";
    if (wordCount > max) return "text-destructive font-semibold";
    return "text-green-600 font-semibold";
  })();

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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadPrompt() {
    setBusy(true);
    setErr(null);
    setResult(null);
    setText("");
    const res = await fetch(`/api/writing/prompts?provider=${provider}&level=${level}`);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Aucune consigne disponible");
      return;
    }
    setPrompt(data.prompt);
    setSecondsLeft(data.prompt.timeLimitMin * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s === null || s <= 0) return 0;
        if (s === 1) {
          // Auto-submit au compte à rebours 0
          setTimeout(() => void submit(), 0);
        }
        return s - 1;
      });
    }, 1000);
  }

  async function submit() {
    if (!prompt) return;
    setBusy(true);
    setErr(null);
    if (timerRef.current) clearInterval(timerRef.current);
    const res = await fetch("/api/writing/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writingPromptId: prompt.id, text }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Soumission impossible");
      return;
    }
    if (data.submission?.status === "PENDING") {
      setPendingId(data.submission.id as string);
      pollRef.current = setInterval(() => void pollWriting(data.submission.id as string), 10_000);
    } else {
      setResult(data.submission as Feedback);
    }
  }

  async function pollWriting(id: string) {
    try {
      const res = await fetch(`/api/writing/submissions/${id}`);
      if (!res.ok) return;
      const data: { submission: { status: string } & Feedback } = await res.json();
      if (data.submission.status === "COMPLETED" || data.submission.status === "FAILED") {
        if (pollRef.current) clearInterval(pollRef.current);
        setPendingId(null);
        if (data.submission.status === "FAILED") {
          setErr("L'évaluation a échoué. Réessayez plus tard.");
        } else {
          setResult(data.submission as Feedback);
        }
      }
    } catch {
      // silent — on réessaiera au prochain tick
    }
  }

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  return (
    <main className="container max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Entraînement Schreiben</h1>

      {!prompt ? (
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
            <Button onClick={() => void loadPrompt()} disabled={busy}>
              {busy ? "Chargement..." : "Obtenir une consigne"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{prompt.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {prompt.provider} {prompt.level} · {prompt.minWords ?? "—"}–{prompt.maxWords ?? "—"} mots ·{" "}
                {prompt.timeLimitMin} min
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{prompt.instructions}</p>
            </CardContent>
          </Card>

          {pendingId ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-blue-500" viewBox="0 0 24 24" fill="none"
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

          {!result && !pendingId && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className={secondsLeft === 0 ? "font-bold text-destructive animate-pulse" : secondsLeft !== null && secondsLeft <= 60 ? "font-bold text-amber-600" : ""}>
                  ⏱ {mm}:{String(ss).padStart(2, "0")}
                  {secondsLeft === 0 ? " — temps écoulé !" : secondsLeft !== null && secondsLeft <= 60 ? " — dépêchez-vous !" : ""}
                </span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className={wordCountColor}>
                    {wordCount} mot{wordCount > 1 ? "s" : ""}
                  </span>
                  {prompt && (
                    <span className="text-xs text-muted-foreground">
                      min {prompt.minWords ?? "—"} / max {prompt.maxWords ?? "—"}
                    </span>
                  )}
                </div>
              </div>
              {prompt?.minWords !== null && wordCount > 0 && wordCount < (prompt?.minWords ?? 0) ? (
                <p className="text-xs text-amber-600">
                  ⚠️ Il manque encore {(prompt?.minWords ?? 0) - wordCount} mot{(prompt?.minWords ?? 0) - wordCount > 1 ? "s" : ""} pour atteindre le minimum requis.
                </p>
              ) : null}
              {prompt?.maxWords !== null && wordCount > (prompt?.maxWords ?? Infinity) ? (
                <p className="text-xs text-destructive">
                  ✗ Vous avez dépassé le maximum de {prompt?.maxWords} mots de {wordCount - (prompt?.maxWords ?? 0)}.
                </p>
              ) : null}
              <HandwritingImport
                onTranscribed={(t) => setText((prev) => (prev ? prev + "\n" : "") + t)}
                disabled={secondsLeft === 0 || busy}
              />
              <textarea
                aria-label="Votre production écrite"
                className="min-h-72 w-full rounded-md border p-4 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Schreiben Sie hier Ihren Text... (ou importez une photo de votre copie ci-dessus)"
                disabled={secondsLeft === 0 || busy}
              />
              <Button onClick={() => void submit()} disabled={busy || wordCount < 5} size="lg">
                {busy ? "Évaluation en cours..." : "Soumettre pour correction IA"}
              </Button>
            </>
          )}

          {result && !pendingId && (
            <>
              <div className="flex items-center gap-2 text-sm" role="group" aria-label="Langue du feedback">
                <span className="text-muted-foreground">Feedback :</span>
                <Button size="sm" variant={!showNative ? "default" : "outline"} onClick={() => setShowNative(false)}>
                  Deutsch
                </Button>
                <Button size="sm" variant={showNative ? "default" : "outline"} onClick={() => setShowNative(true)}>
                  {result.feedback.lang === "en" ? "English" : "Français"}
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Note : {result.scores.totalPoints}/{result.scores.maxPoints} — niveau estimé{" "}
                    {result.scores.estimatedLevel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium">
                    {scoreMessage(Math.round((result.scores.totalPoints / result.scores.maxPoints) * 100))}
                  </p>
                  <p className="text-sm" lang={showNative ? result.feedback.lang : "de"}>
                    {showNative ? result.feedback.summaryNative : result.feedback.summaryDe}
                  </p>
                  <div className="space-y-2">
                    {result.scores.perCriterion.map((c) => (
                      <div key={c.key} className="rounded-md border p-3 text-sm">
                        <p className="font-medium">
                          {c.key} : {c.score}/{c.max}
                        </p>
                        <p className="text-muted-foreground">
                          {showNative ? c.commentNative : c.commentDe}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {result.feedback.errors.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Erreurs relevées</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.feedback.errors.map((e, i) => (
                      <div key={i} className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-3 text-sm">
                        <p className="text-xs font-semibold uppercase text-amber-700">{e.type}</p>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {(showNative ? result.feedback.recommendationsNative : result.feedback.recommendationsDe).map(
                      (r, i) => (
                        <li key={i}>{r}</li>
                      )
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Button onClick={() => setPrompt(null)}>Nouvelle consigne</Button>
            </>
          )}
        </>
      )}

      {err ? (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      ) : null}
    </main>
  );
}
