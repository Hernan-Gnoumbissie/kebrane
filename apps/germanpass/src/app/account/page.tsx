"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useClerk } from "@clerk/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast";

type Proof = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  daysGranted: number | null;
  rejectReason: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Proof["status"], string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};

export default function AccountPage() {
  const { signOut } = useClerk();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [audioConsent, setAudioConsent] = useState<boolean | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [profile, setProfile] = useState<{
    email: string;
    accessUntil: string | null;
    plan: string;
  } | null>(null);
  const [tProvider, setTProvider] = useState("");
  const [tLevel, setTLevel] = useState("");
  const [nativeLang, setNativeLang] = useState("fr");

  async function loadProofs() {
    const res = await fetch("/api/account/payment-proof");
    if (res.ok) {
      const data: { proofs: Proof[] } = await res.json();
      setProofs(data.proofs);
    }
  }

  useEffect(() => {
    void Promise.all([
      loadProofs(),
      fetch("/api/account/consent")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { audioConsent: boolean } | null) => {
          if (data) setAudioConsent(data.audioConsent);
        })
        .catch(() => undefined),
      fetch("/api/account/profile")
        .then((res) => (res.ok ? res.json() : null))
        .then(
          (data: {
            profile: {
              email: string;
              accessUntil: string | null;
              plan: string;
              targetProvider: string | null;
              targetLevel: string | null;
              nativeLang: "fr" | "en";
            };
          } | null) => {
            if (data) {
              setProfile(data.profile);
              setTProvider(data.profile.targetProvider ?? "");
              setTLevel(data.profile.targetLevel ?? "");
              setNativeLang(data.profile.nativeLang);
            }
          }
        )
        .catch(() => undefined),
    ]).finally(() => setLoadingProfile(false));
  }, []);

  async function saveTarget(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetProvider: tProvider || null,
        targetLevel: tLevel || null,
        nativeLang,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Mise à jour de l'objectif impossible");
      return;
    }
    toast.success("Objectif mis à jour ✓");
  }

  async function toggleConsent() {
    if (audioConsent === null) return;
    setBusy(true);
    const next = !audioConsent;
    const res = await fetch("/api/account/consent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioConsent: next }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Mise à jour du consentement impossible");
      return;
    }
    setAudioConsent(next);
    toast.success(next ? "Consentement audio accordé ✓" : "Consentement audio révoqué");
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteConfirm }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error?.message ?? "Suppression impossible");
      return;
    }
    await signOut({ redirectUrl: "/" });
  }

  async function uploadProof(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    if (note) form.set("note", note);
    const res = await fetch("/api/account/payment-proof", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error?.message ?? "Envoi impossible");
      return;
    }
    toast.success("Preuve envoyée — validation en cours ✓");
    setFile(null);
    setNote("");
    void loadProofs();
  }

  async function redeemPromo(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promo }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error?.message ?? "Code promo invalide");
      return;
    }
    toast.success(`Code accepté : +${data.days} jours d'accès ✓`);
    setPromo("");
  }

  return (
    <main className="container max-w-2xl space-y-6 py-10">
      <h1 className="text-3xl font-bold">Mon compte</h1>

      {loadingProfile ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Chargement du profil…
        </div>
      ) : profile ? (
        <p className="text-sm text-muted-foreground">
          {profile.email} · Parcours :{" "}
          {profile.plan === "EXAM_PREP" ? "Préparation intensive examen" : "Complet"}
          {profile.accessUntil
            ? ` · Accès jusqu'au ${new Date(profile.accessUntil).toLocaleDateString("fr-FR")}`
            : ""}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mon objectif</CardTitle>
          <CardDescription>
            L&apos;examen et le niveau visés ciblent vos entraînements et examens blancs par
            défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveTarget} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-provider">Examen visé</Label>
                <select
                  id="t-provider"
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value={tProvider}
                  onChange={(e) => setTProvider(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="GOETHE">Goethe</option>
                  <option value="OSD">ÖSD</option>
                  <option value="TELC">telc</option>
                  <option value="ECL">ECL</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-level">Niveau visé</Label>
                <select
                  id="t-level"
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value={tLevel}
                  onChange={(e) => setTLevel(e.target.value)}
                >
                  <option value="">—</option>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-lang">Langue d&apos;aide</Label>
                <select
                  id="t-lang"
                  className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                  value={nativeLang}
                  onChange={(e) => setNativeLang(e.target.value)}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={busy} className="h-11">
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preuve de paiement</CardTitle>
          <CardDescription>
            JPEG, PNG, WEBP ou PDF. Après validation, votre accès est prolongé de 7, 30, 90 ou 365
            jours selon votre paiement.{" "}
            <a href="/pricing" className="underline">
              Voir les tarifs et modes de paiement
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={uploadProof} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proof">Fichier</Label>
              <Input
                id="proof"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optionnel)</Label>
              <Input id="note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy || !file}>
              {busy ? "Envoi..." : "Envoyer la preuve"}
            </Button>
          </form>

          {proofs.length > 0 ? (
            <ul className="mt-6 space-y-2 text-sm">
              {proofs.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border p-3">
                  <span>{new Date(p.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span>
                    {STATUS_LABEL[p.status]}
                    {p.status === "APPROVED" && p.daysGranted ? ` (+${p.daysGranted} j)` : ""}
                    {p.status === "REJECTED" && p.rejectReason ? ` — ${p.rejectReason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code promo</CardTitle>
          <CardDescription>Un code valide prolonge immédiatement votre accès.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={redeemPromo} className="flex gap-2">
            <Input
              aria-label="Code promo"
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="MONCODE2026"
              required
              minLength={3}
            />
            <Button type="submit" disabled={busy}>
              Utiliser
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confidentialité (RGPD)</CardTitle>
          <CardDescription>
            Consentement pour l&apos;enregistrement audio de l&apos;épreuve Sprechen, révocable à
            tout moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">
              Enregistrement audio :{" "}
              <span className="font-medium">
                {audioConsent === null ? "…" : audioConsent ? "consenti" : "non consenti"}
              </span>
            </p>
            <Button variant="outline" onClick={toggleConsent} disabled={busy || audioConsent === null}>
              {audioConsent ? "Révoquer le consentement" : "Donner mon consentement"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <p className="text-sm">Export de toutes vos données personnelles (JSON).</p>
            <a href="/api/account/export" download className={buttonVariants({ variant: "outline" })}>
              Exporter mes données
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Supprimer mon compte</CardTitle>
          <CardDescription>
            Action définitive : vos données d&apos;identification sont anonymisées immédiatement et
            l&apos;accès est résilié. Tapez <strong>SUPPRIMER</strong> pour confirmer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={deleteAccount} className="flex gap-2">
            <Input
              aria-label="Confirmation de suppression"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              required
            />
            <Button type="submit" variant="destructive" disabled={busy || deleteConfirm !== "SUPPRIMER"}>
              Supprimer
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
