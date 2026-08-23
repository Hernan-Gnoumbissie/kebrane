"use client";

import { useRef, useState } from "react";
import { PenLine } from "lucide-react";

/**
 * Import d'une copie manuscrite (photo) → transcription OCR.
 * Le texte transcrit est renvoyé au parent via `onTranscribed` ; l'élève le
 * relit/corrige ensuite dans le champ de saisie avant soumission.
 */
export function HandwritingImport({
  onTranscribed,
  disabled,
}: {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    const form = new FormData();
    Array.from(files)
      .slice(0, 3)
      .forEach((f) => form.append("images", f));
    try {
      const res = await fetch("/api/writing/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error?.message ?? "Transcription impossible");
        return;
      }
      onTranscribed((data.text as string) ?? "");
    } catch {
      setErr("Transcription impossible — vérifiez votre connexion.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-md border border-dashed p-3 text-sm">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 font-medium underline"
        onClick={() => setOpen((o) => !o)}
      >
        <PenLine aria-hidden="true" className="h-4 w-4" />
        Composé sur papier ? Importer une photo
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Prenez une photo nette et bien éclairée de votre copie (1 à 3 images, JPG/PNG/WEBP).
            Le texte sera transcrit automatiquement — <strong>relisez et corrigez la transcription</strong>{" "}
            avant de soumettre, l&apos;OCR peut faire des erreurs (ä/ö/ü/ß, écriture cursive).
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            disabled={disabled || busy}
            onChange={(e) => void handleFiles(e.target.files)}
            className="block text-xs"
          />
          {busy ? <p className="text-xs text-info">Transcription en cours…</p> : null}
          {err ? <p className="text-xs text-destructive">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
