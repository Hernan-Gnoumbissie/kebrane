"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AdminProof = {
  id: string;
  filePath: string;
  note: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string; status: string };
};

const DAYS = [7, 30, 90, 365] as const;

export default function AdminProofsPage() {
  const [proofs, setProofs] = useState<AdminProof[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/proofs?status=PENDING");
    if (res.ok) {
      const data: { proofs: AdminProof[] } = await res.json();
      setProofs(data.proofs);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function decide(id: string, body: { decision: "approve"; days: number } | { decision: "reject"; reason: string }) {
    setBusy(id);
    setErr(null);
    const res = await fetch(`/api/admin/proofs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error?.message ?? "Action impossible");
      return;
    }
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Preuves de paiement en attente</h1>
      {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
      {proofs.length === 0 ? <p className="text-muted-foreground">Aucune preuve en attente.</p> : null}
      <div className="space-y-4">
        {proofs.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {p.user.name} — {p.user.email}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Reçue le {new Date(p.createdAt).toLocaleString("fr-FR")}
                {p.note ? ` · Note : ${p.note}` : ""}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/files/${p.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                Voir le fichier
              </a>
              {DAYS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  disabled={busy === p.id}
                  onClick={() => void decide(p.id, { decision: "approve", days: d })}
                >
                  +{d} j
                </Button>
              ))}
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === p.id}
                onClick={() => {
                  const reason = window.prompt("Motif du refus :");
                  if (reason && reason.trim().length >= 3) {
                    void decide(p.id, { decision: "reject", reason: reason.trim() });
                  }
                }}
              >
                Refuser
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
