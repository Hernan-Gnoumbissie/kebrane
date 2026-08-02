/**
 * Graphiques SVG légers, sans dépendance, rendus côté serveur.
 * Couleurs : vert ≥ 60 % (seuil de réussite), ambre 40-59 %, rouge < 40 %.
 */

function colorFor(pct: number): string {
  return pct >= 60 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
}

/** Courbe d'évolution des scores (aire + points). */
export function ScoreLineChart({ data }: { data: { date: string; pct: number }[] }) {
  if (data.length === 0) return null;
  const w = 560;
  const h = 170;
  const pad = 26;
  const n = data.length;
  const x = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1));
  const y = (pct: number) => h - pad - ((h - 2 * pad) * pct) / 100;
  const pts = data.map((d, i) => `${x(i)},${y(d.pct)}`).join(" ");
  const area = `${x(0)},${h - pad} ${pts} ${x(n - 1)},${h - pad}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Évolution des scores">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" strokeOpacity={0.07} />
          <text x={2} y={y(g) + 3} fontSize={9} fill="currentColor" opacity={0.45}>
            {g}
          </text>
        </g>
      ))}
      <line x1={pad} x2={w - pad} y1={y(60)} y2={y(60)} stroke="#16a34a" strokeOpacity={0.35} strokeDasharray="4 4" />
      <polygon points={area} fill="#2563eb" opacity={0.09} />
      <polyline
        points={pts}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.pct)} r={3.5} fill="#2563eb" />
          {n <= 12 ? (
            <text x={x(i)} y={y(d.pct) - 8} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.7}>
              {d.pct}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/** Anneau de progression (par compétence). */
export function Donut({ pct, label, sublabel }: { pct: number; label: string; sublabel?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 90 90" className="h-24 w-24" role="img" aria-label={`${label} : ${pct} %`}>
        <circle cx={45} cy={45} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={9} />
        <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={colorFor(pct)}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`}
          transform="rotate(-90 45 45)"
        />
        <text x={45} y={51} textAnchor="middle" fontSize={18} fontWeight={700} fill="currentColor">
          {pct}%
        </text>
      </svg>
      <p className="text-sm font-medium">{label}</p>
      {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
    </div>
  );
}

/** Barre horizontale (réussite par format de tâche). */
export function HBar({ label, sub, pct }: { label: string; sub?: string; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">
          {label}
          {sub ? <span className="text-muted-foreground"> · {sub}</span> : null}
        </span>
        <span className="shrink-0 font-medium">{pct} %</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: colorFor(pct) }}
        />
      </div>
    </div>
  );
}
