import { db } from "@/lib/db";
import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { AdminKpiCard } from "./components/AdminKpiCard";
import { AdminBarChart } from "./components/AdminBarChart";
import { AdminDonutGauge } from "./components/AdminDonutGauge";
import { PendingProofsWidget, type ProofRow } from "./components/PendingProofsWidget";

// ─── Types ──────────────────────────────────────────────────────────────────

type MonthData = { month: string; count: number; year: number; monthNum: number };

// ─── Data fetching ───────────────────────────────────────────────────────────

async function getDashboardData() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalUsers,
    thisMonthUsers,
    lastMonthUsers,
    activeSubscribers,
    pendingProofs,
    recentProofsRaw,
    recentSignupsRaw,
  ] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.user.count({
      where: { createdAt: { gte: thisMonthStart }, status: { not: "DELETED" } },
    }),
    db.user.count({
      where: {
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
        status: { not: "DELETED" },
      },
    }),
    db.user.count({ where: { status: "ACTIVE", accessUntil: { gt: now } } }),
    db.paymentProof.count({ where: { status: "PENDING" } }),
    db.paymentProof.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        filePath: true,
        note: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.user.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo },
        status: { not: "DELETED" },
      },
      select: { createdAt: true },
    }),
  ]);

  // Monthly signups grouped by month
  const monthlyData: MonthData[] = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      month: d.toLocaleDateString("fr-FR", { month: "short" }),
      count: 0,
      year: d.getFullYear(),
      monthNum: d.getMonth(),
    };
  });
  for (const u of recentSignupsRaw) {
    const idx = monthlyData.findIndex(
      (m) =>
        m.year === u.createdAt.getFullYear() &&
        m.monthNum === u.createdAt.getMonth()
    );
    if (idx >= 0) { const entry = monthlyData[idx]; if (entry) entry.count++; }
  }

  const variation =
    lastMonthUsers === 0
      ? null
      : Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100);

  const conversionRate =
    totalUsers === 0 ? 0 : Math.round((activeSubscribers / totalUsers) * 100);

  const recentProofs: ProofRow[] = recentProofsRaw.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    totalUsers,
    thisMonthUsers,
    lastMonthUsers,
    variation,
    activeSubscribers,
    pendingProofs,
    conversionRate,
    monthlyData,
    recentProofs,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminHomePage() {
  const {
    totalUsers,
    thisMonthUsers,
    variation,
    activeSubscribers,
    pendingProofs,
    conversionRate,
    monthlyData,
    recentProofs,
  } = await getDashboardData();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <span>Admin</span>
          <span>/</span>
          <span className="text-gray-600 font-medium">Vue d&apos;ensemble</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Vue d&apos;ensemble</h1>
        <p className="text-sm text-gray-500 capitalize">{today}</p>
      </div>

      {/* KPI cards — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminKpiCard
          icon={<Users className="h-5 w-5" />}
          label="Inscrits total"
          value={totalUsers.toLocaleString("fr-FR")}
          sublabel={`${thisMonthUsers} nouveaux ce mois`}
          trend={variation !== null ? { value: variation, label: "vs mois dernier" } : undefined}
          accent="blue"
          href="/admin/users"
        />
        <AdminKpiCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Abonnés actifs"
          value={activeSubscribers.toLocaleString("fr-FR")}
          sublabel="accès non expiré"
          accent="green"
          href="/admin/users"
        />
        <AdminKpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Preuves en attente"
          value={pendingProofs}
          sublabel={pendingProofs > 0 ? "Action requise" : "Aucune preuve"}
          accent={pendingProofs > 0 ? "red" : "amber"}
          href="/admin/proofs"
          alert={pendingProofs > 0}
        />
        <AdminKpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Taux de conversion"
          value={`${conversionRate}%`}
          sublabel="abonnés / inscrits"
          accent="violet"
        />
      </div>

      {/* Charts row — bar chart 2/3, donut 1/3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminBarChart data={monthlyData} />
        </div>
        <div className="lg:col-span-1">
          <AdminDonutGauge value={conversionRate} target={30} />
        </div>
      </div>

      {/* Pending proofs — full width */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Preuves de paiement en attente
            </h2>
            <p className="text-xs text-gray-400">5 plus récentes</p>
          </div>
        </div>
        <PendingProofsWidget initial={recentProofs} />
      </div>
    </div>
  );
}
