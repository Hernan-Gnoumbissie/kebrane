"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, CheckCircle2, Circle, CircleDot, Lock, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncIndicator } from "@/components/SyncIndicator";
import { useOffline } from "@/hooks/useOffline";
import { saveCards, getOfflineCards, addPendingReview, type OfflineCard } from "@/lib/offline-db";

type Course = {
  id: string;
  level: string;
  kind: string;
  title: string;
  lessons: { id: string; title: string; progress: { status: string; bestScore: number | null } }[];
};

type LessonView = {
  lesson: {
    id: string;
    title: string;
    contentMd: string;
    helpMd: string | null;
    helpLang: "fr" | "en";
    audioUrl: string | null;
  };
  exercises: {
    id: string;
    taskFormat: string;
    prompt: string;
    isChapterTest: boolean;
    clientMetadata: Record<string, unknown> | null;
  }[];
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const KIND_LABEL: Record<string, string> = { GRAMMAR: "Grammaire", VOCABULARY: "Vocabulaire", REDEMITTEL: "Redemittel" };

export default function LearnPage() {
  const { isOffline, pendingCount, refreshPendingCount } = useOffline();
  const [level, setLevel] = useState("A1");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [view, setView] = useState<"courses" | "lesson" | "flashcards">("courses");
  const [lesson, setLesson] = useState<LessonView | null>(null);
  const [cards, setCards] = useState<OfflineCard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [flashcardsSource, setFlashcardsSource] = useState<"online" | "offline" | null>(null);

  // Charger le niveau actuel depuis le profil
  useEffect(() => {
    void fetch("/api/account/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile: { currentLevel: string | null } } | null) => {
        if (data?.profile.currentLevel) {
          setCurrentLevel(data.profile.currentLevel);
          setLevel(data.profile.currentLevel);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isOffline) void loadCourses(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, isOffline]);

  async function loadCourses(lv: string) {
    setLoadingCourses(true);
    try {
      const res = await fetch(`/api/learn/courses?level=${lv}`);
      if (res.ok) {
        const d: { courses: Course[] } = await res.json();
        setCourses(d.courses);
      }
    } catch {
      // offline — on affiche ce qui est précaché par le SW (StaleWhileRevalidate)
    }
    setLoadingCourses(false);
  }

  async function openLesson(id: string) {
    const res = await fetch(`/api/learn/lessons/${id}`);
    if (res.ok) {
      setLesson((await res.json()) as LessonView);
      setView("lesson");
      setMsg(null);
    }
  }

  const startFlashcards = useCallback(async () => {
    // 1. Essayer l'API (en ligne ou via cache SW NetworkFirst)
    try {
      const res = await fetch(`/api/learn/flashcards/due?level=${level}`);
      if (res.ok) {
        const d: { cards: OfflineCard[] } = await res.json();
        if (d.cards.length > 0) {
          // Sauvegarder en IndexedDB pour usage hors-ligne ultérieur
          void saveCards(d.cards).catch(() => undefined);
          setCards(d.cards);
          setFlashcardsSource("online");
          setCardIdx(0);
          setShowBack(false);
          setView("flashcards");
          return;
        }
      }
    } catch {
      // réseau indisponible → fallback IndexedDB
    }

    // 2. Fallback : cartes mises en cache dans IndexedDB
    const cached = await getOfflineCards();
    if (cached.length > 0) {
      setCards(cached);
      setFlashcardsSource("offline");
      setCardIdx(0);
      setShowBack(false);
      setView("flashcards");
    } else {
      setMsg(
        isOffline
          ? "Aucune carte en cache. Connectez-vous d'abord pour charger le deck."
          : "Aucune carte à réviser pour le moment."
      );
    }
  }, [level, isOffline]);

  const reviewCard = useCallback(
    async (quality: number) => {
      const card = cards[cardIdx];
      if (!card) return;

      if (isOffline || flashcardsSource === "offline") {
        // Mode hors-ligne : stocker la révision dans IndexedDB
        await addPendingReview(card.id, quality).catch(() => undefined);
        refreshPendingCount();
      } else {
        // Mode en ligne : envoyer directement au serveur
        try {
          const res = await fetch(`/api/learn/flashcards/${card.id}/review`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quality }),
          });
          if (!res.ok) {
            // Envoyer en ligne a échoué → mettre en queue
            await addPendingReview(card.id, quality).catch(() => undefined);
            refreshPendingCount();
          }
        } catch {
          // Connexion coupée durant la session → queue
          await addPendingReview(card.id, quality).catch(() => undefined);
          refreshPendingCount();
        }
      }

      setShowBack(false);
      if (cardIdx + 1 < cards.length) {
        setCardIdx(cardIdx + 1);
      } else {
        setView("courses");
        setFlashcardsSource(null);
        const pendingMsg =
          pendingCount > 0 || isOffline
            ? ` (${pendingCount + 1} révision${pendingCount + 1 > 1 ? "s" : ""} synchronisée${pendingCount + 1 > 1 ? "s" : ""} au retour du réseau)`
            : "";
        setMsg(`Révision terminée !${pendingMsg}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, cardIdx, isOffline, flashcardsSource, pendingCount, refreshPendingCount]
  );

  const card = cards[cardIdx];

  // Raccourcis clavier pour les flashcards
  useEffect(() => {
    if (view !== "flashcards") return;
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        setShowBack(true);
      } else if (e.key === "1" && showBack) {
        void reviewCard(1);
      } else if (e.key === "2" && showBack) {
        void reviewCard(3);
      } else if (e.key === "3" && showBack) {
        void reviewCard(5);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, showBack, cardIdx, reviewCard]);

  return (
    <main className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Apprentissage</h1>
        <SyncIndicator />
      </div>

      {/* Bandeau offline en mode flashcards */}
      {view === "flashcards" && flashcardsSource === "offline" && (
        <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm text-foreground">
          <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
          Mode hors ligne — vos réponses seront synchronisées au retour du réseau.
        </div>
      )}

      {msg ? <p className="rounded-md bg-success/10 p-3 text-sm text-foreground">{msg}</p> : null}

      {view === "courses" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map((l) => {
              const isLocked = currentLevel && LEVELS.indexOf(l) > LEVELS.indexOf(currentLevel as (typeof LEVELS)[number]);
              const isMastered = currentLevel && LEVELS.indexOf(l) < LEVELS.indexOf(currentLevel as (typeof LEVELS)[number]);
              return (
                <Button
                  key={l}
                  size="sm"
                  variant={l === level ? "default" : "outline"}
                  disabled={!!isLocked}
                  onClick={() => !isLocked && setLevel(l)}
                  title={isLocked ? `Débloque ce niveau en atteignant 70 % de score moyen en ${currentLevel}` : undefined}
                  className={isMastered ? "opacity-60" : ""}
                >
                  {isMastered ? (
                    <Check aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                  ) : isLocked ? (
                    <Lock aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                  ) : null}
                  {l}
                </Button>
              );
            })}
            <Button size="sm" variant="secondary" onClick={() => void startFlashcards()}>
              🃏 Réviser le vocabulaire (SRS)
            </Button>
          </div>

          {isOffline ? (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground">
              <strong>Mode hors ligne</strong> — les chapitres ne peuvent pas être chargés sans connexion.
              Vous pouvez quand même réviser vos flashcards si elles ont été mises en cache.
            </div>
          ) : null}

          {!isOffline && loadingCourses ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Chargement des chapitres…
            </div>
          ) : !isOffline && courses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center space-y-3">
              <p className="text-muted-foreground">Aucun chapitre publié pour le niveau {level} pour le moment.</p>
              <p className="text-sm text-muted-foreground">
                Essayez un autre niveau ou entraînez-vous en attendant.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["A1", "A2", "B1", "B2", "C1", "C2"].filter((l) => l !== level).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className="text-sm underline"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {courses.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {c.title}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {KIND_LABEL[c.kind] ?? c.kind} · {c.level}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {c.lessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <button
                        className="text-left underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => !isOffline && void openLesson(l.id)}
                        disabled={isOffline}
                        title={isOffline ? "Connexion requise" : undefined}
                      >
                        {/* Trois états, trois icônes distinctes de FORME (pas
                            seulement de couleur) : cercle coché, cercle en
                            cours, cercle vide. */}
                        {l.progress.status === "COMPLETED" ? (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
                        ) : l.progress.status === "IN_PROGRESS" ? (
                          <CircleDot aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <Circle aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        {l.title}
                        {isOffline && <span className="ml-1 text-xs text-warning">(hors ligne)</span>}
                      </button>
                      {l.progress.bestScore !== null ? (
                        <span className="text-muted-foreground">{l.progress.bestScore} %</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </>
      ) : null}

      {view === "lesson" && lesson ? (
        <LessonRunner lesson={lesson} onBack={() => setView("courses")} onDone={(m) => { setMsg(m); setView("courses"); void loadCourses(level); }} />
      ) : null}

      {view === "flashcards" ? (
        card ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl" lang="de">
                {card.article ? `${card.article} ` : ""}
                {card.front}
                {card.plural ? <span className="text-base text-muted-foreground"> (pl. {card.plural})</span> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {showBack ? (
                <>
                  <p className="text-xl font-medium">{card.back}</p>
                  <p className="text-sm" lang="de">
                    {card.exampleDe}
                  </p>
                  <p className="text-sm text-muted-foreground">{card.exampleFr}</p>
                  <div className="flex justify-center gap-2">
                    <Button variant="destructive" onClick={() => void reviewCard(1)}>
                      Oublié
                    </Button>
                    <Button variant="outline" onClick={() => void reviewCard(3)}>
                      Difficile
                    </Button>
                    <Button onClick={() => void reviewCard(5)}>Facile</Button>
                  </div>
                  <p className="text-xs text-muted-foreground/70 select-none">
                    [1] Oublié &nbsp;·&nbsp; [2] Difficile &nbsp;·&nbsp; [3] Facile
                  </p>
                </>
              ) : (
                <>
                  <Button onClick={() => setShowBack(true)}>Révéler la réponse</Button>
                  <p className="text-xs text-muted-foreground/70 select-none">[Espace] Révéler</p>
                </>
              )}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Carte {cardIdx + 1} / {cards.length}
                  {flashcardsSource === "offline" && (
                    <span className="ml-2 text-warning">· hors ligne</span>
                  )}
                </p>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground">Aucune carte à réviser. Revenez plus tard !</p>
        )
      ) : null}
    </main>
  );
}

function LessonRunner({
  lesson,
  onBack,
  onDone,
}: {
  lesson: LessonView;
  onBack: () => void;
  onDone: (msg: string) => void;
}) {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const answers = Object.entries(responses).map(([exerciseId, response]) => ({ exerciseId, response }));
    const res = await fetch(`/api/learn/lessons/${lesson.lesson.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(d.error?.message ?? "Soumission impossible");
      return;
    }
    onDone(
      d.score.chapterValidated
        ? `Chapitre validé ! (${d.score.pctTest} % ≥ ${d.score.threshold} %)`
        : `Score : ${d.score.pctTest} % — il faut ${d.score.threshold} % pour valider le chapitre. Réessayez !`
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack}>
        ← Retour aux chapitres
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{lesson.lesson.title}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none" lang="de">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.lesson.contentMd}</ReactMarkdown>
          {lesson.lesson.audioUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={lesson.lesson.audioUrl} className="mt-4 w-full" />
          ) : null}
          {lesson.lesson.helpMd ? (
            <details className="not-prose mt-4 rounded-md border bg-muted/30 p-3">
              <summary className="cursor-pointer text-sm font-medium">
                {lesson.lesson.helpLang === "en" ? "🇬🇧 Help in English" : "🇫🇷 Aide en français"}
              </summary>
              <div className="prose prose-sm mt-2 max-w-none" lang={lesson.lesson.helpLang}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.lesson.helpMd}</ReactMarkdown>
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>

      {lesson.exercises.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exercices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lesson.exercises.map((ex) => (
              <ExerciseWidget key={ex.id} ex={ex} onChange={(v) => setResponses((r) => ({ ...r, [ex.id]: v }))} />
            ))}
            {err ? <p className="text-sm text-destructive">{err}</p> : null}
            <Button onClick={() => void submit()} disabled={busy || Object.keys(responses).length === 0}>
              {busy ? "Correction..." : "Vérifier mes réponses"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ExerciseWidget({
  ex,
  onChange,
}: {
  ex: LessonView["exercises"][number];
  onChange: (v: unknown) => void;
}) {
  const meta = ex.clientMetadata ?? {};
  const options = (meta.options as { id: string; text: string }[] | undefined) ?? [];
  const gapIds = (meta.gapIds as string[] | undefined) ?? [];
  const [sel, setSel] = useState<string[]>([]);
  const [gaps, setGaps] = useState<Record<string, string>>({});

  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-sm font-medium">
        {ex.isChapterTest ? "⭐ " : ""}
        {ex.prompt}
      </p>

      {(ex.taskFormat === "MCQ_SINGLE" || ex.taskFormat === "MCQ_MULTI") &&
        options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type={ex.taskFormat === "MCQ_SINGLE" ? "radio" : "checkbox"}
              name={ex.id}
              checked={sel.includes(o.id)}
              onChange={() => {
                const next =
                  ex.taskFormat === "MCQ_SINGLE"
                    ? [o.id]
                    : sel.includes(o.id)
                      ? sel.filter((x) => x !== o.id)
                      : [...sel, o.id];
                setSel(next);
                onChange({ optionIds: next });
              }}
            />
            {o.text}
          </label>
        ))}

      {ex.taskFormat === "TRUE_FALSE" &&
        [
          { l: "Richtig", v: true },
          { l: "Falsch", v: false },
        ].map((opt) => (
          <label key={opt.l} className="mr-4 inline-flex items-center gap-2 text-sm">
            <input type="radio" name={ex.id} onChange={() => onChange({ value: opt.v })} />
            {opt.l}
          </label>
        ))}

      {ex.taskFormat === "GAP_FILL" && (
        <div className="space-y-1">
          {typeof meta.textWithGaps === "string" && meta.textWithGaps ? (
            <p className="text-sm text-muted-foreground">{meta.textWithGaps}</p>
          ) : null}
          {gapIds.map((gapId, i) => (
            <div key={gapId} className="flex items-center gap-2 text-sm">
              <span>({i + 1})</span>
              <input
                aria-label={`Trou ${i + 1}`}
                className="h-8 max-w-48 rounded-md border px-2"
                value={gaps[gapId] ?? ""}
                onChange={(e) => {
                  const next = { ...gaps, [gapId]: e.target.value };
                  setGaps(next);
                  onChange({ gaps: Object.entries(next).map(([id, value]) => ({ gapId: id, value })) });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
