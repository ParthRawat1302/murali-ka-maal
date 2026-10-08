import type { Difficulty } from "@/lib/types";

type Counts = Record<Difficulty, { total: number; solved: number }>;

function Ring({
  value,
  total,
  size,
  stroke,
  color,
  children,
}: {
  value: number;
  total: number;
  size: number;
  stroke: number;
  color: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

const META: { key: Difficulty; label: string; color: string; text: string }[] = [
  { key: "easy", label: "Easy", color: "var(--easy)", text: "text-easy" },
  { key: "medium", label: "Medium", color: "var(--medium)", text: "text-medium" },
  { key: "hard", label: "Hard", color: "var(--hard)", text: "text-hard" },
];

export function StatsRings({ counts }: { counts: Counts }) {
  const total = counts.easy.total + counts.medium.total + counts.hard.total;
  const solved = counts.easy.solved + counts.medium.solved + counts.hard.solved;
  const pct = total ? Math.round((solved / total) * 100) : 0;

  return (
    <div className="card flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-center">
      <Ring value={solved} total={total} size={132} stroke={10} color="var(--accent)">
        <span className="text-3xl font-bold leading-none">{solved}</span>
        <span className="mt-1 text-xs text-muted">/ {total} solved</span>
        <span className="mt-0.5 text-[11px] text-muted">{pct}%</span>
      </Ring>
      <div className="grid w-full grid-cols-3 gap-3 sm:gap-5">
        {META.map(({ key, label, color, text }) => (
          <div key={key} className="flex flex-col items-center gap-2 rounded-lg bg-surface-2 px-2 py-3">
            <Ring value={counts[key].solved} total={counts[key].total} size={72} stroke={7} color={color}>
              <span className="text-base font-semibold leading-none">{counts[key].solved}</span>
              <span className="text-[10px] text-muted">/{counts[key].total}</span>
            </Ring>
            <span className={`text-sm font-medium ${text}`}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
