export function AdminDonutGauge({
  value,
  target = 30,
}: {
  value: number;
  target?: number;
}) {
  const r = 68;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * r;
  const clamp = (v: number) => Math.min(Math.max(v, 0), 100);

  const valueDash = (clamp(value) / 100) * circumference;
  const targetDash = (clamp(target) / 100) * circumference;

  const ratio = target > 0 ? value / target : 0;
  const color = ratio >= 1 ? "#10b981" : ratio >= 0.7 ? "#3b82f6" : "#f59e0b";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Objectif de conversion</h2>
        <p className="text-xs text-gray-400">Abonnés / Inscrits</p>
      </div>

      <div className="flex flex-col items-center pt-2">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#f1f5f9" strokeWidth="14"
          />
          {/* Target arc (gray) */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#e2e8f0" strokeWidth="14"
            strokeDasharray={`${targetDash} ${circumference - targetDash}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke={color} strokeWidth="14"
            strokeDasharray={`${valueDash} ${circumference - valueDash}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
          />
          {/* Center % — big */}
          <text
            x={cx} y={cy - 8}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 30, fill: "#111827", fontWeight: 700 }}
          >
            {value}%
          </text>
          {/* Sub-label */}
          <text
            x={cx} y={cy + 22}
            textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 11, fill: "#6b7280" }}
          >
            Objectif {target}%
          </text>
        </svg>

        {/* Legend — Actuel vs Objectif */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-5 rounded-full"
              style={{ background: color }}
            />
            Actuel
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full bg-gray-200" />
            Objectif
          </span>
        </div>
      </div>
    </div>
  );
}
