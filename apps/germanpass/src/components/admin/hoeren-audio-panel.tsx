"use client";

/**
 * Panneau audio d'un passage Hören (administration).
 *
 * Il répond à une question simple que l'ancienne interface ne posait jamais :
 * « qui parle, avec quelle voix, et est-ce que ça existe déjà ? ». Sans elle,
 * l'admin ne pouvait que relancer une génération à l'aveugle.
 *
 * L'écoute avant publication se fait ici : le fichier est servi par
 * /api/files, la même route que côté apprenant, donc ce qu'on entend est
 * exactement ce qu'ils entendront.
 */
import { useState } from "react";
import { AlertTriangle, Check, Clock, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SpeakerCaste = {
  id: string;
  nom: string;
  genre: string;
  role?: string;
  profilId: string;
  voix: string;
};

export type SegmentAudio = {
  index: number;
  speakerId: string;
  voix: string;
  debut: number;
  fin: number;
};

export type EtatAudio = {
  audioStatus: "NONE" | "PENDING" | "GENERATING" | "READY" | "FAILED";
  audioPath: string | null;
  audioDurationSec: number | null;
  audioGeneratedAt: string | null;
  audioError: string | null;
  situation: string | null;
  speakers: SpeakerCaste[] | null;
  dialogue: { speaker_id: string; text: string }[] | null;
  audioSegments: SegmentAudio[] | null;
};

const LIBELLE_STATUT: Record<EtatAudio["audioStatus"], string> = {
  NONE: "Aucun audio",
  PENDING: "En file",
  GENERATING: "Génération en cours",
  READY: "Prêt",
  FAILED: "Échec",
};

function formatDuree(secondes: number | null): string {
  if (secondes === null) return "—";
  const m = Math.floor(secondes / 60);
  const s = Math.round(secondes % 60);
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

export function HoerenAudioPanel({ passageId, etat }: { passageId: string; etat: EtatAudio }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const estDialogue = Array.isArray(etat.speakers) && etat.speakers.length > 0;

  async function lancer(recasterVoix: boolean) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(`/api/admin/passages/${passageId}/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recasterVoix }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Lancement impossible");
      return;
    }
    setMsg(
      recasterVoix
        ? "Nouvelles voix distribuées, génération en file. Le dialogue est conservé."
        : "Génération en file. Rechargez la page dans une minute."
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Audio Hören</CardTitle>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              etat.audioStatus === "READY" && "bg-success/15 text-success",
              etat.audioStatus === "FAILED" && "bg-destructive/10 text-destructive",
              (etat.audioStatus === "PENDING" || etat.audioStatus === "GENERATING") &&
                "bg-muted text-muted-foreground",
              etat.audioStatus === "NONE" && "bg-muted text-muted-foreground"
            )}
          >
            {etat.audioStatus === "READY" ? (
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
            ) : etat.audioStatus === "FAILED" ? (
              <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
            ) : etat.audioStatus === "GENERATING" ? (
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {LIBELLE_STATUT[etat.audioStatus]}
          </span>
        </div>
        <CardDescription>
          {estDialogue
            ? "Dialogue multi-voix : chaque personnage est enregistré avec sa propre voix."
            : "Passage à voix unique (créé avant la refonte, ou monologue). Il reste pleinement fonctionnel."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {msg ? <p role="status" className="rounded-md bg-success/10 p-3 text-sm">{msg}</p> : null}
        {err ? <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{err}</p> : null}

        {etat.audioStatus === "FAILED" && etat.audioError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <strong>Motif de l&apos;échec :</strong> {etat.audioError}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Situation</dt>
            <dd>{etat.situation ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Durée</dt>
            <dd>{formatDuree(etat.audioDurationSec)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Généré le</dt>
            <dd>
              {etat.audioGeneratedAt
                ? new Date(etat.audioGeneratedAt).toLocaleString("fr-FR")
                : "—"}
            </dd>
          </div>
        </dl>

        {estDialogue ? (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Distribution
            </p>
            <ul className="space-y-1 text-sm">
              {etat.speakers!.map((s) => (
                <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{s.nom}</span>
                  {s.role ? <span className="text-muted-foreground">({s.role})</span> : null}
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">
                    {s.voix}
                  </span>
                </li>
              ))}
            </ul>
            {/* L'invariant, affiché : si deux personnages partageaient une voix,
                l'exercice serait exactement le défaut qu'on vient de corriger. */}
            {new Set(etat.speakers!.map((s) => s.voix)).size < etat.speakers!.length ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-destructive">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                Deux personnages partagent une voix — régénérez avec un nouveau casting.
              </p>
            ) : null}
          </div>
        ) : null}

        {etat.audioPath ? (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Volume2 aria-hidden="true" className="h-3.5 w-3.5" />
              Écoute avant publication
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls preload="none" src={`/api/files/${etat.audioPath}`} className="w-full" />
          </div>
        ) : null}

        {estDialogue && etat.audioSegments && etat.audioSegments.length > 0 ? (
          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Repères des {etat.audioSegments.length} répliques
            </summary>
            <ol className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {etat.audioSegments.map((seg) => {
                const perso = etat.speakers?.find((s) => s.id === seg.speakerId);
                return (
                  <li key={seg.index}>
                    {seg.debut.toFixed(1)}s → {seg.fin.toFixed(1)}s ·{" "}
                    <strong>{perso?.nom ?? seg.speakerId}</strong> ({seg.voix})
                  </li>
                );
              })}
            </ol>
          </details>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || etat.audioStatus === "GENERATING"}
            onClick={() => void lancer(false)}
          >
            {etat.audioPath ? "Régénérer l'audio" : "Générer l'audio"}
          </Button>
          {estDialogue ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || etat.audioStatus === "GENERATING"}
              onClick={() => void lancer(true)}
            >
              <RefreshCw aria-hidden="true" className="mr-1.5 h-4 w-4" />
              Changer les voix
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          L&apos;audio est un actif permanent : généré une fois, réécouté sans limite et sans
          nouvelle dépense. Rien n&apos;est synthétisé quand un apprenant lance la lecture.
        </p>
      </CardContent>
    </Card>
  );
}
