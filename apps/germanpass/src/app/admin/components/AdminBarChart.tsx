import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface BarData {
  month: string;
  count: number;
}

export function AdminBarChart({ data }: { data: BarData[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 160;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Inscriptions mensuelles</h2>
          <p className="text-xs text-gray-400">12 derniers mois</p>
        </div>
        <Link
          href="/admin/users"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          Voir tous <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="relative bg-slate-50 rounded-lg p-3">
        {/* Y-axis grid lines */}
        <div
          className="absolute inset-3 flex flex-col justify-between pb-6 pt-1 pointer-events-none"
          aria-hidden
        >
          {[max, Math.round(max * 0.5), 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-[10px] text-gray-400">{v}</span>
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>
          ))}
        </div>

        {/* Bars */}
        <div
          className="relative ml-7 flex items-end gap-[2px]"
          style={{ height: chartHeight + 24 }}
        >
          {data.map((d, i) => {
            const heightPct = (d.count / max) * chartHeight;
            const isCurrent = i === data.length - 1;
            return (
              <div
                key={i}
                className="group relative flex flex-1 flex-col items-center"
              >
                {/* Hover tooltip — value above bar */}
                <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="rounded bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow">
                    {d.count} inscrit{d.count !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Bar */}
                <div
                  style={{ height: Math.max(heightPct, 2) }}
                  className={`w-full rounded-t transition-colors ${
                    isCurrent
                      ? "bg-blue-600"
                      : "bg-blue-200 group-hover:bg-blue-400"
                  }`}
                />

                {/* Month label */}
                <span
                  className={`mt-1 text-[9px] capitalize ${
                    isCurrent
                      ? "font-semibold text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  {d.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
