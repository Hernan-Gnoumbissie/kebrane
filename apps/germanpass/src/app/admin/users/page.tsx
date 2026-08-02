"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROVIDERS, LEVELS } from "@/lib/content-enums";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  accessUntil: string | null;
  plan: "FULL" | "EXAM_PREP";
  targetProvider: string | null;
  targetLevel: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [q, setQ]               = useState("");
  const [busy, setBusy]         = useState<string | null>(null);
  const [editing, setEditing]   = useState<AdminUser | null>(null);
  // Création de compte candidat
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName]       = useState("");
  const [cEmail, setCEmail]     = useState("");
  const [cDays, setCDays]       = useState(30);
  const [cProvider, setCProvider] = useState("");
  const [cLevel, setCLevel]     = useState("");
  const [cCurrentLevel, setCCurrentLevel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function load(query = "") {
    const res = await fetch(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    if (res.ok) {
      const data: { users: AdminUser[] } = await res.json();
      setUsers(data.users);
    }
  }

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const initialQ = params.get("q") ?? "";
    setQ(initialQ);
    void load(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function action(id: string, body: object) {
    setBusy(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    await load(q);
    // Rafraîchit aussi l'utilisateur en cours d'édition
    setEditing((prev) => {
      if (!prev || prev.id !== id) return prev;
      return users.find((u) => u.id === id) ?? prev;
    });
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateErr(null);
    setCreateMsg(null);
    setInviteLink(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: cName,
        email: cEmail,
        days: cDays,
        ...(cProvider ? { targetProvider: cProvider } : {}),
        currentLevel: cCurrentLevel,
        ...(cLevel ? { targetLevel: cLevel } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      setCreateErr(data.error?.message ?? "Création impossible.");
      return;
    }
    setCreateMsg(`Compte créé pour ${cEmail} — invitation envoyée par e-mail.`);
    setInviteLink(data.inviteUrl ?? null);
    setCName("");
    setCEmail("");
    await load(q);
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Button variant={showCreate ? "outline" : "default"} size="sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Fermer" : "➕ Créer un compte candidat"}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={createAccount} className="space-y-4 rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Le compte est activé immédiatement pour la durée choisie ; le candidat reçoit un e-mail
            pour définir son mot de passe.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-name">Nom</label>
              <Input id="cu-name" value={cName} onChange={(e) => setCName(e.target.value)} required minLength={2} maxLength={120} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-email">E-mail</label>
              <Input id="cu-email" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required maxLength={255} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-days">Durée d&apos;accès</label>
              <select id="cu-days" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cDays} onChange={(e) => setCDays(Number(e.target.value))}>
                <option value={1}>24 heures</option>
                <option value={7}>7 jours</option>
                <option value={30}>30 jours</option>
                <option value={90}>90 jours</option>
                <option value={365}>365 jours</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-provider">Examen visé (opt.)</label>
              <select id="cu-provider" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cProvider} onChange={(e) => setCProvider(e.target.value)}>
                <option value="">—</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-current">Niveau actuel <span className="text-destructive">*</span></label>
              <select id="cu-current" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cCurrentLevel} onChange={(e) => setCCurrentLevel(e.target.value)}>
                <option value="" disabled>— Choisir —</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="cu-level">Niveau visé (opt.)</label>
              <select id="cu-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cLevel} onChange={(e) => setCLevel(e.target.value)}>
                <option value="">—</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          {createErr ? <p role="alert" className="text-sm text-destructive">{createErr}</p> : null}
          {createMsg ? <p role="status" className="text-sm text-green-700">{createMsg}</p> : null}
          {inviteLink ? (
            <p className="break-all rounded-md bg-muted/50 p-2 text-xs">
              Lien d&apos;invitation (à copier si besoin) : <span className="font-mono">{inviteLink}</span>
            </p>
          ) : null}
          <Button type="submit" disabled={creating}>
            {creating ? "Création…" : "Créer le compte"}
          </Button>
        </form>
      )}

      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => { e.preventDefault(); void load(q); }}
      >
        <Input aria-label="Recherche" placeholder="Nom ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit">Rechercher</Button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1.5">Nom</th>
              <th className="px-2 py-1.5">E-mail</th>
              <th className="px-2 py-1.5">Statut</th>
              <th className="px-2 py-1.5">Objectif</th>
              <th className="px-2 py-1.5">Parcours</th>
              <th className="px-2 py-1.5">Accès jusqu&apos;au</th>
              <th className="px-2 py-1.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              // Accès expiré = date dépassée (indépendant du statut, que le cron ne met à jour que la nuit).
              const expired =
                u.role !== "ADMIN" && u.accessUntil
                  ? new Date(u.accessUntil).getTime() < Date.now()
                  : false;
              return (
              <tr key={u.id} className={`border-t transition-colors ${expired ? "bg-amber-50 hover:bg-amber-100/60" : "hover:bg-muted/30"}`}>
                <td className="px-2 py-1.5">{u.name}</td>
                <td className="px-2 py-1.5">{u.email}</td>
                <td className="px-2 py-1.5">
                  {expired ? (
                    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">
                      Expiré
                    </span>
                  ) : (
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      u.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {u.status}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {u.targetProvider || u.targetLevel
                    ? `${u.targetProvider ?? "?"} ${u.targetLevel ?? ""}`.trim()
                    : "—"}
                </td>
                <td className="px-2 py-1.5">
                  {u.plan === "EXAM_PREP" ? "Examen" : "Complet"}
                </td>
                <td className="px-2 py-1.5">
                  {u.accessUntil ? (
                    <span className={expired ? "font-medium text-amber-700" : ""}>
                      {new Date(u.accessUntil).toLocaleDateString("fr-FR")}
                      {expired ? " · expiré" : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    title="Modifier ce profil"
                    disabled={u.role === "ADMIN"}
                    onClick={() => setEditing(u)}
                    className="rounded p-1 hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    {/* Icône crayon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal d'édition ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border bg-background shadow-xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-base">{editing.name}</p>
                <p className="text-xs text-muted-foreground">{editing.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded p-1 hover:bg-muted transition-colors text-muted-foreground"
                aria-label="Fermer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Prolonger l'accès */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prolonger l&apos;accès</p>
              <div className="flex gap-2">
                {[7, 30, 90, 365].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    disabled={busy === editing.id}
                    onClick={() => void action(editing.id, { action: "grant", days: d })}
                  >
                    +{d}j
                  </Button>
                ))}
              </div>
            </div>

            {/* Parcours */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parcours</p>
              <div className="flex gap-2">
                {(["FULL", "EXAM_PREP"] as const).map((plan) => (
                  <Button
                    key={plan}
                    size="sm"
                    variant={editing.plan === plan ? "default" : "outline"}
                    className="flex-1 text-xs"
                    disabled={busy === editing.id || editing.plan === plan}
                    onClick={() => void action(editing.id, { action: "set_plan", plan })}
                  >
                    {plan === "FULL" ? "Complet" : "Examen"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Suspension */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compte</p>
              {editing.status === "SUSPENDED" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs"
                  disabled={busy === editing.id}
                  onClick={() => void action(editing.id, { action: "unsuspend" })}
                >
                  Réactiver le compte
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full text-xs"
                  disabled={busy === editing.id}
                  onClick={() => {
                    const reason = window.prompt("Motif de suspension :");
                    if (reason && reason.trim().length >= 3) {
                      void action(editing.id, { action: "suspend", reason: reason.trim() });
                    }
                  }}
                >
                  Suspendre le compte
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
