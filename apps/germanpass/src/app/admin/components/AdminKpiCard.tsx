import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: { value: number; label: string };
  accent?: "blue" | "green" | "amber" | "red" | "violet";
  href?: string;
  alert?: boolean;
}

const accentStyles: Record<NonNullable<KpiCardProps["accent"]>, { ring: string; icon: string }> = {
  blue:   { ring: "bg-blue-50",   icon: "text-blue-600" },
  green:  { ring: "bg-emerald-50", icon: "text-emerald-600" },
  amber:  { ring: "bg-amber-50",  icon: "text-amber-500" },
  red:    { ring: "bg-red-50",    icon: "text-red-500" },
  violet: { ring: "bg-violet-50", icon: "text-violet-600" },
};

function TrendBadge({ value, label }: { value: number; label: string }) {
  if (value === 0) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-gray-400">
        <Minus className="h-3 w-3" />
        stable
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positive ? "+" : ""}
      {value} {label}
    </span>
  );
}

export function AdminKpiCard({
  icon,
  label,
  value,
  sublabel,
  trend,
  accent = "blue",
  href,
  alert,
}: KpiCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <div
      className={`flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${
        href ? "transition-shadow hover:shadow-md" : ""
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.ring}`}
      >
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p
          className={`text-2xl font-bold tracking-tight leading-tight ${
            alert ? "text-red-600" : "text-gray-900"
          }`}
        >
          {value}
        </p>
        {sublabel && (
          <p className="mt-0.5 text-xs text-gray-400">{sublabel}</p>
        )}
        {trend != null && (
          <TrendBadge value={trend.value} label={trend.label} />
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
