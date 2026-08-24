import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Clock,
  Layers,
  Lock,
  MapPin,
  Mic,
  PenLine,
  Puzzle,
  Target,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { tendanceScore } from "@/lib/tendance";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgressData, SECTION_LABEL } from "@/lib/progress";
import { ScoreLineChart, Donut, HBar } from "@/components/charts";
import { TASK_FORMAT_LABELS } from "@/lib/content-enums";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "DELETED") redirect("/login");

  // L'admin n'a plus de tableau de bord dupliqué (les KPIs sont dans /admin) :
  // /dashboard lui sert de « vue candidat » pour tester la plateforme.
  const params = await searchParams;
  const isTrial = params.trial === "1";

  const daysLeft = user.accessUntil
    ? Math.max(0, Math.ceil((user.accessUntil.getTime() - Date.now()) / 86_400_000))
    : null;
  const prepDay = Math.max(1, Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000) + 1);
  const p = await getProgressData(user);
  const hasLearn = user.plan === "FULL";

  // Progression au niveau actuel (sessions + score moyen)
  // Fallback A1 si la migration add_current_level n'est pas encore appliquée.
  const effectiveLevel = (user.currentLevel as string | null) ?? "A1";
  const currentLevelAttempts = await db.attempt.findMany({
    where: { userId: user.id, kind: "PRACTICE", status: "GRADED", passage: { level: effectiveLevel as never } },
    select: { scores: true },
  });
  const currentLevelSessions = currentLevelAttempts.length;
  const currentLevelAvgPct =
    currentLevelSessions > 0
      ? Math.round(
          (currentLevelAttempts.reduce((sum, a) => {
            const s = a.scores as { pct?: number } | null;
            return sum + (s?.pct ?? 0);
          }, 0) /
            currentLevelSessions) *
            10
        ) / 10
      : 0;
  const recentHistory = p.history.slice(-12);
  // Tendance calculee sur l'historique complet, pas sur les 12 derniers points
  // affiches : le graphique tronque pour rester lisible, la tendance non.
  const tendance = tendanceScore(p.history);
  const hasData = p.history.length > 0 || p.sections.length > 0;

  // Seuil d'urgence : ≤ 3 jours restants
  const isExpiring = daysLeft !== null && daysLeft <= 3;
  const isExpired = daysLeft !== null && daysLeft === 0;

  return (
    <main className="container space-y-5 py-6 md:py-10">
      {/* ── Bannière bienvenue trial ── */}
      {isTrial && (
        <Alert variant="info" titre="Bienvenue sur GermanPass">
          <p>
            Votre essai gratuit de <strong>24 heures</strong> est actif. Explorez librement toutes
            les fonctionnalités — Lesen, Hören, Schreiben, Sprechen, examens blancs et apprentissage.
          </p>
          <Link href="/pricing" className="mt-2 inline-block font-medium underline">
            Voir les formules d&apos;accès
          </Link>
        </Alert>
      )}

      {/* ── Alerte expiration imminente (≤ 3 j) ── */}
      {!isTrial && isExpiring && !isExpired && (
        <Alert variant="warning" titre="Accès expirant bientôt">
          <p>
            Il vous reste <strong>{daysLeft} jour{daysLeft > 1 ? "s" : ""}</strong>. Renouvelez
            dès maintenant pour ne pas interrompre votre préparation.
          </p>
          <Link href="/pricing" className="mt-2 inline-block font-medium underline">
            Renouveler mon accès
          </Link>
        </Alert>
      )}

      {/* ── Accès expiré ── */}
      {isExpired && (
        <Alert variant="error" titre="Votre accès a expiré">
          <p>Renouvelez votre abonnement pour reprendre votre préparation.</p>
          <Link href="/pricing" className="mt-2 inline-block font-medium underline">
            Renouveler mon accès
          </Link>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Bonjour {(user.name ?? "").split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jour <strong>{prepDay}</strong> de votre préparation
            {p.target.level ? ` vers le ${p.target.level}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
              isExpiring && "border-warning/40 bg-warning/10 font-medium"
            )}
          >
            <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            {daysLeft ?? "—"} jours d&apos;accès
          </span>
          {p.target.provider || p.target.level ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <Target aria-hidden="true" className="h-3.5 w-3.5" />
              {p.target.provider ?? ""} {p.target.level ?? ""}
            </span>
          ) : (
            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 underline"
            >
              <Target aria-hidden="true" className="h-3.5 w-3.5" />
              Définir mon objectif
            </Link>
          )}
        </div>
      </div>

      {/* ── Chiffres clés ──
          Affichés seulement s'il y a de quoi les remplir : une rangée de zéros
          le premier jour décourage au lieu d'informer. */}
      {hasData ? (
        <div
          className={cn(
            "grid gap-3 sm:grid-cols-2",
            hasLearn ? "lg:grid-cols-4" : "lg:grid-cols-3"
          )}
        >
          <StatCard
            icone={Target}
            label={`Score moyen · ${effectiveLevel}`}
            valeur={`${currentLevelAvgPct} %`}
            precision="70 % requis pour le niveau suivant"
            tendance={tendance}
          />
          <StatCard
            icone={ClipboardList}
            label="Sessions corrigées"
            valeur={currentLevelSessions}
            precision={`au niveau ${effectiveLevel}`}
          />
          <StatCard
            icone={PenLine}
            label="Productions évaluées"
            valeur={p.production.writingCount + p.production.speakingCount}
            precision={`${p.production.writingCount} écrites · ${p.production.speakingCount} orales`}
          />
          {/* Quatrième carte seulement avec le parcours complet — et on y met
              une information ACTIONNABLE. « Jour de préparation » et « jours
              d'accès » figurent déjà dans l'en-tête juste au-dessus : les
              répéter aurait rempli la grille sans rien apprendre. */}
          {hasLearn ? (
            <StatCard
              icone={Layers}
              label="Cartes à réviser"
              valeur={p.dueCards}
              precision={`${p.lessonsDone} leçon${p.lessonsDone > 1 ? "s" : ""} terminée${p.lessonsDone > 1 ? "s" : ""}`}
            />
          ) : null}
        </div>
      ) : null}

      {/* ── Barre de progression CECRL ── */}
      <LevelProgressStrip
        currentLevel={effectiveLevel}
        targetLevel={user.targetLevel ?? undefined}
        sessions={currentLevelSessions}
        avgPct={currentLevelAvgPct}
      />

      {!hasData ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bienvenue ! Commencez votre préparation</CardTitle>
            <CardDescription>
              Vos statistiques et votre plan de travail personnalisé apparaîtront ici dès vos
              premiers entraînements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/practice" className={buttonVariants()}>
              Premier entraînement Lesen/Hören
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {p.plan.length > 0 ? (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList aria-hidden="true" className="h-4 w-4 text-primary" />
              Mon plan d&apos;amélioration
            </CardTitle>
            <CardDescription>
              Généré à partir de vos résultats — mis à jour à chaque entraînement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {p.plan.slice(0, 5).map((a, i) => (
                <li key={i} className="flex items-start gap-3 rounded-md border p-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.detail}</p>
                  </div>
                  <Link href={a.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Y aller
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {hasData ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              {/* Titre, sous-titre et lien d'action : les trois détails qui
                  donnaient à l'écran d'administration son air fini. Le lien
                  transforme un graphique en point de départ plutôt qu'en
                  cul-de-sac. */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    Évolution de mes scores
                  </CardTitle>
                  <CardDescription>
                    {recentHistory.length} dernière{recentHistory.length > 1 ? "s" : ""} session
                    {recentHistory.length > 1 ? "s" : ""} — le pointillé marque le seuil de
                    réussite (60 %).
                  </CardDescription>
                </div>
                <Link
                  href="/progress"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Ma progression
                  <ArrowRight aria-hidden="true" className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentHistory.length > 0 ? (
                <ScoreLineChart data={recentHistory.map((h) => ({ date: h.date, pct: h.pct }))} />
              ) : (
                <p className="text-sm text-muted-foreground">Aucune session corrigée pour le moment.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    Réussite par compétence
                  </CardTitle>
                  <CardDescription>
                    Sur vos dernières réponses corrigées — vert au-dessus de 60 %.
                  </CardDescription>
                </div>
                <Link
                  href="/practice"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  S&apos;entraîner
                  <ArrowRight aria-hidden="true" className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {p.sections.length > 0 ? (
                <div className="flex flex-wrap justify-around gap-4">
                  {p.sections.map((s) => (
                    <Donut key={s.section} pct={s.pct} label={s.label} sublabel={`${s.answered} réponses`} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pas encore de réponses corrigées.</p>
              )}
              {/* Compteurs de production. Les icônes remplacent les emojis mais
                  ne portent aucune information seules : chaque valeur reste
                  lisible en texte. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PenLine aria-hidden="true" className="h-3.5 w-3.5" />
                  {p.production.writingCount} Schreiben
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mic aria-hidden="true" className="h-3.5 w-3.5" />
                  {p.production.speakingCount} Sprechen
                </span>
                {p.production.lastEstimatedLevel ? (
                  <span>dernier niveau estimé : {p.production.lastEstimatedLevel}</span>
                ) : null}
                {hasLearn ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
                      {p.lessonsDone} leçon(s)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers aria-hidden="true" className="h-3.5 w-3.5" />
                      {p.dueCards} carte(s) à réviser
                    </span>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {p.formats.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Puzzle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  Par type de tâche
                </CardTitle>
                <CardDescription>
                  Du plus faible au plus fort — les premiers sont ceux à travailler.
                </CardDescription>
              </div>
              <Link
                href="/practice"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                S&apos;entraîner
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.formats.slice(0, 6).map((f) => (
              <HBar
                key={`${f.section}:${f.taskFormat}`}
                label={TASK_FORMAT_LABELS[f.taskFormat] ?? f.taskFormat}
                sub={`${SECTION_LABEL[f.section] ?? f.section} · ${f.answered} réponses`}
                pct={f.pct}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accès rapide</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/practice" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Lesen/Hören
          </Link>
          <Link href="/practice/schreiben" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Schreiben
          </Link>
          <Link href="/practice/sprechen" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Sprechen
          </Link>
          <Link href="/exams" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Examens blancs
          </Link>
          {hasLearn ? (
            <Link href="/learn" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Apprentissage
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

const ALL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function LevelProgressStrip({
  currentLevel: currentLevelProp,
  targetLevel,
  sessions,
  avgPct,
}: {
  currentLevel: string | null | undefined;
  targetLevel?: string;
  sessions: number;
  avgPct: number;
}) {
  // Fallback A1 si la colonne currentLevel n'existe pas encore en BDD (migration pending).
  const currentLevel = (currentLevelProp && ALL_LEVELS.includes(currentLevelProp as (typeof ALL_LEVELS)[number]))
    ? currentLevelProp
    : "A1";
  const currentIdx = ALL_LEVELS.indexOf(currentLevel as (typeof ALL_LEVELS)[number]);

  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Progression CECRL
        {targetLevel ? ` — objectif : ${targetLevel}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        {ALL_LEVELS.map((level, idx) => {
          const isCurrent = idx === currentIdx;
          const isMastered = idx < currentIdx;
          const isLocked = idx > currentIdx;
          const isTarget = level === targetLevel && !isCurrent;

          return (
            <div key={level} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                  isCurrent && "bg-primary text-primary-foreground",
                  isMastered && "bg-success/15 text-success",
                  isLocked && "bg-muted text-muted-foreground opacity-60"
                )}
              >
                {/* L'icône double le statut, elle ne le remplace pas : le niveau
                    reste écrit, et `title` le nomme pour les lecteurs d'écran. */}
                {isMastered ? (
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                ) : isCurrent ? (
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                )}
                <span>{level}</span>
                {isTarget ? (
                  <Target aria-hidden="true" className="ml-0.5 h-3.5 w-3.5 text-accent" />
                ) : null}
              </div>
              {idx < ALL_LEVELS.length - 1 && (
                <span className={`text-xs ${isLocked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Progression au niveau actuel */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <span>
            Niveau {currentLevel} — {sessions} session{sessions !== 1 ? "s" : ""}, score moyen{" "}
            <strong>{avgPct} %</strong> / 70 % requis
          </span>
        </div>
        {sessions > 0 ? (
          <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                avgPct >= 70 ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${Math.min(avgPct, 100)}%` }}
              aria-hidden="true"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
