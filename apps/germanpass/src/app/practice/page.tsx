"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { LevelSelector } from "@/components/LevelSelector";
import { cn } from "@/lib/utils";

type SanQuestion = {
  id: string;
  taskFormat: string;
  prompt: string;
  points: number;
  options: { id: string; text: string }[];
  clientMetadata: {
    left?: { leftId: string; text: string }[];
    right?: { rightId: string; text: string }[];
    textWithGaps?: string;
    gapIds?: string[];
    items?: { itemId: string; text: string }[];
  } | null;
};

type Session = {
  attemptId: string;
  passage: { id: string; title: string; body: string | null; audioUrl: string | null; maxListens: number };
  questions: SanQuestion[];
};

type ResultRow = {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  points: number;
  explanation: string | null;
  explanationFr: string | null;
  explanationEn: string | null;
};

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

function scoreMessage(pct: number): string {
  if (pct >= 90) return "Performance exceptionnelle ! Tu es prêt(e) pour le niveau suivant.";
  if (pct >= 70) return "Excellent résultat ! Tu maîtrises bien ce niveau.";
  if (pct >= 50) return "Bon travail ! Tu progresses bien, continue sur ta lancée.";
  return "Ne te décourage pas, chaque essai compte ! Analyse tes erreurs et réessaie.";
}

type ExplLang = "de" | "fr" | "en";
const EXPL_LANGS: { value: ExplLang; label: string }[] = [
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

function pickExplanation(r: ResultRow, lang: ExplLang): string | null {
  if (lang === "fr") return r.explanationFr ?? r.explanation;
  if (lang === "en") return r.explanationEn ?? r.explanation;
  return r.explanation;
}

export default function PracticePage() {
  const [section, setSection] = useState<"LESEN" | "HOEREN">("LESEN");
  const [level, setLevel] = useState<Level>("B1");
  const [session, setSession] = useState<Session | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<{ pct: number; rows: ResultRow[] } | null>(null);
  const [listensLeft, setListensLeft] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [explLang, setExplLang] = useState<ExplLang>("de");
  const [targetLevel, setTargetLevel] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [unlockedLevel, setUnlockedLevel] = useState<string | null>(null);

  // Objectif déclaré : niveau par défaut + signalement des niveaux hors objectif.
  useEffect(() => {
    void fetch("/api/account/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile: { targetLevel: string | null; currentLevel: string | null } } | null) => {
        if (data?.profile.currentLevel) {
          setCurrentLevel(data.profile.currentLevel);
          // Préselectionner le niveau actuel (ou l'objectif si défini)
          setLevel((data.profile.targetLevel ?? data.profile.currentLevel) as Level);
        }
        if (data?.profile.targetLevel) {
          setTargetLevel(data.profile.targetLevel);
        }
      })
      .catch(() => undefined);
  }, []);

  async function start() {
    setBusy(true);
    setErr(null);
    setResults(null);
    setResponses({});
    const res = await fetch("/api/practice/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, level }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (data.error?.code === "LEVEL_LOCKED") {
        setErr(data.error.message ?? "Ce niveau n'est pas encore débloqué.");
      } else {
        setErr(data.error?.message ?? "Impossible de démarrer la session");
      }
      return;
    }
    setSession(data as Session);
    setListensLeft((data as Session).passage.maxListens);
  }

  async function listen() {
    if (!session) return;
    const res = await fetch(`/api/practice/attempts/${session.attemptId}/listen`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setListensLeft(0);
      setErr(data.error?.message ?? "Écoute refusée");
      return;
    }
    setListensLeft(data.remaining);
    const audio = document.getElementById("hoeren-audio") as HTMLAudioElement | null;
    if (audio) {
      audio.currentTime = 0;
      void audio.play();
    }
  }

  async function submit() {
    if (!session) return;
    setBusy(true);
    setErr(null);
    const answers = Object.entries(responses).map(([questionId, response]) => ({ questionId, response }));
    const res = await fetch(`/api/practice/attempts/${session.attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Soumission impossible");
      return;
    }
    setResults({ pct: data.score.pct, rows: data.results });
    // Notification de déblocage de niveau
    if (data.levelUnlocked?.unlocked && data.levelUnlocked?.newLevel) {
      setUnlockedLevel(data.levelUnlocked.newLevel as string);
      setCurrentLevel(data.levelUnlocked.newLevel as string);
    }
  }

  function setResponse(id: string, value: unknown) {
    setResponses((r) => ({ ...r, [id]: value }));
  }

  function renderQuestion(q: SanQuestion) {
    const r = results?.rows.find((row) => row.questionId === q.id);
    return (
      <Card
        key={q.id}
        className={cn(r && (r.isCorrect ? "border-success/60" : "border-destructive/60"))}
      >
        <CardHeader>
          <CardTitle className="text-base">{q.prompt}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(q.taskFormat === "MCQ_SINGLE" || q.taskFormat === "MCQ_MULTI") &&
            q.options.map((o) => {
              const current = (responses[q.id] as { optionIds?: string[] })?.optionIds ?? [];
              const checked = current.includes(o.id);
              return (
                <label key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type={q.taskFormat === "MCQ_SINGLE" ? "radio" : "checkbox"}
                    name={q.id}
                    disabled={!!results}
                    checked={checked}
                    onChange={() => {
                      const next =
                        q.taskFormat === "MCQ_SINGLE"
                          ? [o.id]
                          : checked
                            ? current.filter((id) => id !== o.id)
                            : [...current, o.id];
                      setResponse(q.id, { optionIds: next });
                    }}
                  />
                  {o.text}
                </label>
              );
            })}

          {q.taskFormat === "TRUE_FALSE" && (
            <div className="flex gap-4">
              {[
                { label: "Richtig", value: true },
                { label: "Falsch", value: false },
              ].map((opt) => (
                <label key={opt.label} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    disabled={!!results}
                    checked={(responses[q.id] as { value?: boolean })?.value === opt.value}
                    onChange={() => setResponse(q.id, { value: opt.value })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {q.taskFormat === "MATCHING" &&
            q.clientMetadata?.left?.map((l) => {
              const pairs = (responses[q.id] as { pairs?: { leftId: string; rightId: string }[] })?.pairs ?? [];
              const selected = pairs.find((p) => p.leftId === l.leftId)?.rightId ?? "";
              return (
                <div key={l.leftId} className="flex items-center gap-2 text-sm">
                  <span className="min-w-40">{l.text}</span>
                  <select
                    aria-label={`Correspondance pour ${l.text}`}
                    className="rounded-md border p-1"
                    disabled={!!results}
                    value={selected}
                    onChange={(e) => {
                      const next = pairs.filter((p) => p.leftId !== l.leftId);
                      if (e.target.value) next.push({ leftId: l.leftId, rightId: e.target.value });
                      setResponse(q.id, { pairs: next });
                    }}
                  >
                    <option value="">—</option>
                    {q.clientMetadata?.right?.map((rt) => (
                      <option key={rt.rightId} value={rt.rightId}>
                        {rt.text}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}

          {q.taskFormat === "GAP_FILL" && (
            <div className="space-y-2">
              {q.clientMetadata?.textWithGaps ? (
                <p className="text-sm text-muted-foreground">{q.clientMetadata.textWithGaps}</p>
              ) : null}
              {q.clientMetadata?.gapIds?.map((gapId, i) => {
                const gaps = (responses[q.id] as { gaps?: { gapId: string; value: string }[] })?.gaps ?? [];
                const value = gaps.find((g) => g.gapId === gapId)?.value ?? "";
                return (
                  <div key={gapId} className="flex items-center gap-2 text-sm">
                    <span>Trou {i + 1} :</span>
                    <Input
                      className="max-w-48"
                      disabled={!!results}
                      value={value}
                      onChange={(e) => {
                        const next = gaps.filter((g) => g.gapId !== gapId);
                        next.push({ gapId, value: e.target.value });
                        setResponse(q.id, { gaps: next });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {q.taskFormat === "ORDERING" && (
            <OrderingWidget
              items={q.clientMetadata?.items ?? []}
              disabled={!!results}
              onChange={(order) => setResponse(q.id, { order })}
            />
          )}

          {r ? (
            <div className="mt-2 rounded-md bg-muted p-3 text-sm">
              <p
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  r.isCorrect ? "text-success" : "text-destructive"
                )}
              >
                {r.isCorrect ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <X aria-hidden="true" className="h-4 w-4" />
                )}
                {r.isCorrect ? "Correct" : "Incorrect"} — {r.pointsAwarded}/{r.points} pt
              </p>
              {pickExplanation(r, explLang) ? (
                <p className="mt-1 text-muted-foreground" lang={explLang}>
                  {pickExplanation(r, explLang)}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Nombre de questions sans réponse
  const unanswered = session
    ? session.questions.filter((q) => {
        const r = responses[q.id];
        if (!r) return true;
        const rTyped = r as Record<string, unknown>;
        if (q.taskFormat === "MCQ_SINGLE" || q.taskFormat === "MCQ_MULTI") {
          return ((rTyped.optionIds as string[] | undefined) ?? []).length === 0;
        }
        if (q.taskFormat === "TRUE_FALSE") return rTyped.value === undefined;
        if (q.taskFormat === "MATCHING") return ((rTyped.pairs as unknown[] | undefined) ?? []).length === 0;
        return false;
      }).length
    : 0;

  return (
    <main className="container max-w-3xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Entraînement Lesen / Hören</h1>

      {/* ── Notification de déblocage de niveau ── */}
      {unlockedLevel ? (
        <Alert variant="success" titre={`Niveau ${unlockedLevel} débloqué`}>
          <p>Tu as atteint 70 % de score moyen sur 5 sessions. Continue sur ta lancée !</p>
          <button className="mt-2 text-xs underline" onClick={() => setUnlockedLevel(null)}>
            Fermer
          </button>
        </Alert>
      ) : null}

      {!session ? (
        busy ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Chargement de la session…
          </div>
        ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Compétence</p>
              <select
                aria-label="Compétence"
                className="h-11 rounded-md border bg-background px-3 text-sm"
                value={section}
                onChange={(e) => setSection(e.target.value as "LESEN" | "HOEREN")}
              >
                <option value="LESEN">Lesen</option>
                <option value="HOEREN">Hören</option>
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Niveau</p>
              <LevelSelector
                currentLevel={currentLevel}
                targetLevel={targetLevel}
                selected={level}
                onChange={(l) => setLevel(l as Level)}
              />
            </div>
            <Button onClick={() => void start()} disabled={busy} className="h-11">
              {busy ? "Chargement..." : "Démarrer"}
            </Button>
            </div>
          </CardContent>
        </Card>
        )
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{session.passage.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {session.passage.body ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{session.passage.body}</p>
              ) : null}
              {session.passage.audioUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio id="hoeren-audio" src={session.passage.audioUrl} preload="none" />
                  <Button onClick={() => void listen()} disabled={listensLeft === 0 || !!results}>
                    ▶ Écouter ({listensLeft ?? session.passage.maxListens} restante·s)
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {results ? (
            <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Langue des explications">
              <span className="text-muted-foreground">Explications :</span>
              {EXPL_LANGS.map((l) => (
                <Button
                  key={l.value}
                  size="sm"
                  variant={explLang === l.value ? "default" : "outline"}
                  onClick={() => setExplLang(l.value)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          ) : null}

          <div className="space-y-4">{session.questions.map(renderQuestion)}</div>

          {results ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-xl font-bold">Score : {results.pct} %</p>
                {results.pct >= 60 ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
                    <Check aria-hidden="true" className="h-4 w-4" />
                    Seuil de réussite atteint (60 %)
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">Seuil de réussite : 60 %. Continuez à vous entraîner !</p>
                )}
                <p className="mt-2 text-sm font-medium">{scoreMessage(results.pct)}</p>
                <Button className="mt-4" onClick={() => setSession(null)}>
                  Nouvelle session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {!busy && unanswered > 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-warning">
                  <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                  {unanswered} question{unanswered > 1 ? "s" : ""} sans réponse
                </p>
              ) : null}
              <Button onClick={() => void submit()} disabled={busy} size="lg">
                {busy ? "Correction..." : "Soumettre"}
              </Button>
            </div>
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

function OrderingWidget({
  items,
  disabled,
  onChange,
}: {
  items: { itemId: string; text: string }[];
  disabled: boolean;
  onChange: (order: string[]) => void;
}) {
  const [order, setOrder] = useState(items.map((i) => i.itemId));

  function move(index: number, dir: -1 | 1) {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index] as string;
    next[index] = next[target] as string;
    next[target] = a;
    setOrder(next);
    onChange(next);
  }

  return (
    <ol className="space-y-1">
      {order.map((id, i) => {
        const item = items.find((it) => it.itemId === id);
        return (
          <li key={id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            <span className="flex-1">{item?.text}</span>
            <Button size="sm" variant="outline" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label="Monter">
              ↑
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || i === order.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Descendre"
            >
              ↓
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
