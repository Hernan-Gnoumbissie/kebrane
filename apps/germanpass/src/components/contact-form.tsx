"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES = [
  { value: "QUESTION", label: "Question" },
  { value: "PROBLEM", label: "Problème / bug" },
  { value: "FEEDBACK", label: "Suggestion / avis" },
];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("QUESTION");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, type, message }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error?.message ?? "Envoi impossible. Réessayez.");
      return;
    }
    setDone(true);
    setName("");
    setEmail("");
    setMessage("");
    setType("QUESTION");
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-success/10 p-6 text-center text-sm text-foreground">
        <p className="flex items-center justify-center gap-1.5 font-semibold">
          <Check aria-hidden="true" className="h-4 w-4 text-success" />
          Message envoyé
        </p>
        <p className="mt-1">Merci ! Nous revenons vers vous au plus vite à l&apos;adresse indiquée.</p>
        <button type="button" className="mt-3 underline" onClick={() => setDone(false)}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="c-name">Nom</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-email">E-mail</Label>
          <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-type">Motif</Label>
        <select
          id="c-type"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-message">Message</Label>
        <textarea
          id="c-message"
          className="min-h-32 w-full rounded-md border bg-background p-3 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          placeholder="Décrivez votre question, le problème rencontré ou votre suggestion…"
        />
      </div>
      {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
      <Button type="submit" disabled={busy} size="lg">
        {busy ? "Envoi…" : "Envoyer le message"}
      </Button>
    </form>
  );
}
