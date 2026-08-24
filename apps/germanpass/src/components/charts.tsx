/**
 * Graphiques SVG légers, sans dépendance, rendus côté serveur.
 *
 * Couleurs : uniquement des TOKENS de la charte (QW-2). Elles étaient
 * auparavant écrites en hexadécimal dans le SVG — `#2563eb` pour la courbe,
 * `#16a34a` / `#d97706` / `#dc2626` pour les seuils. Ces valeurs échappaient au
 * thème (aucune adaptation au mode sombre) et le bleu contredisait la décision
 * PO : l'accent GermanPass est le Rouge de la charte, pas un bleu.
 *
 * On passe par les utilitaires `fill-*` / `stroke-*` de Tailwind plutôt que par
 * l'attribut SVG : les classes sont écrites en toutes lettres, donc visibles du
 * compilateur, et suivent le thème comme le reste de l'interface.
 *
 * Seuils inchangés : ≥ 60 % réussite, 40-59 % à consolider, < 40 % à travailler.
 */
import { cn } from "@/lib/utils";

/** Classe de REMPLISSAGE selon le score (barres, aplats). */
function bgFor(pct: number): string {
  return pct >= 60 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive";
}

/** Classe de TRAIT selon le score (anneaux). */
function strokeFor(pct: number): string {
  return pct >= 60 ? "stroke-success" : pct >= 40 ? "stroke-warning" : "stroke-destructive";
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
    // Zone de trace teintee : detache le graphique du fond de la carte. Reprise
    // de l'ecran d'administration, mais en `bg-muted` plutot qu'en `bg-slate-50`
    // code en dur — la teinte suit ainsi le mode sombre.
    <div className="rounded-lg bg-muted/40 p-3">
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Évolution des scores">
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="currentColor" strokeOpacity={0.07} />
          <text x={2} y={y(g) + 3} fontSize={9} fill="currentColor" opacity={0.45}>
            {g}
          </text>
        </g>
      ))}
      {/* Seuil de réussite à 60 % */}
      <line
        x1={pad}
        x2={w - pad}
        y1={y(60)}
        y2={y(60)}
        className="stroke-success"
        strokeOpacity={0.35}
        strokeDasharray="4 4"
      />
      <polygon points={area} className="fill-primary" opacity={0.09} />
      <polyline
        points={pts}
        fill="none"
        className="stroke-primary"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.pct)} r={3.5} className="fill-primary" />
          {n <= 12 ? (
            <text x={x(i)} y={y(d.pct) - 8} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.7}>
              {d.pct}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
    </div>
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
          className={strokeFor(pct)}
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
          className={cn("h-full rounded-full transition-all", bgFor(pct))}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
