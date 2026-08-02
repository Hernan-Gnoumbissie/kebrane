"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  name: string;
  email: string;
  type: string;
  message: string;
  handled: boolean;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  QUESTION: "Question",
  PROBLEM: "Problème",
  FEEDBACK: "Suggestion",
};

const TYPE_COLOR: Record<string, string> = {
  QUESTION: "bg-blue-100 text-blue-700",
  PROBLEM: "bg-red-100 text-red-700",
  FEEDBACK: "bg-green-100 text-green-700",
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/messages${onlyOpen ? "?open=1" : ""}`);
    if (res.ok) {
      const data: { messages: Message[] } = await res.json();
      setMessages(data.messages);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyOpen]);

  async function toggle(id: string, handled: boolean) {
    setBusy(id);
    await fetch("/api/admin/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, handled }),
    });
    setBusy(null);
    void load();
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString("fr-FR");

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Messages de contact</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
          Afficher uniquement les non traités
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun message.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`rounded-lg border p-4 ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[m.type] ?? ""}`}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                  <span className="font-medium">{m.name}</span>
                  <a href={`mailto:${m.email}`} className="text-sm text-blue-600 underline">{m.email}</a>
                </div>
                <span className="text-xs text-muted-foreground">{fmt(m.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant={m.handled ? "outline" : "default"} disabled={busy === m.id} onClick={() => toggle(m.id, !m.handled)}>
                  {m.handled ? "Rouvrir" : "Marquer comme traité"}
                </Button>
                <a href={`mailto:${m.email}`} className="text-sm text-muted-foreground underline self-center">
                  Répondre par e-mail
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
