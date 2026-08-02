"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Promo = {
  id: string;
  code: string;
  daysGranted: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
};

export default function AdminPromoCodesPage() {
  const [codes, setCodes] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/promo-codes");
    if (res.ok) {
      const data: { codes: Promo[] } = await res.json();
      setCodes(data.codes);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, daysGranted: days, maxUses }),
    });
    if (!res.ok) {
      setErr("Création impossible (code déjà existant ?)");
      return;
    }
    setCode("");
    void load();
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Codes promo</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Nouveau code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required minLength={3} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="days">Jours offerts</Label>
              <Input id="days" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxUses">Utilisations max</Label>
              <Input id="maxUses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
            </div>
            {err ? <p className="col-span-2 text-sm text-destructive">{err}</p> : null}
            <Button type="submit" className="col-span-2">
              Créer
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Jours</th>
              <th className="p-3">Utilisations</th>
              <th className="p-3">Actif</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-mono">{c.code}</td>
                <td className="p-3">{c.daysGranted}</td>
                <td className="p-3">
                  {c.usedCount}/{c.maxUses}
                </td>
                <td className="p-3">{c.active ? "Oui" : "Non"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
