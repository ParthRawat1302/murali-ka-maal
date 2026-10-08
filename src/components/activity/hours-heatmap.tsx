"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { addDays, formatDuration, weekday } from "@/lib/activity";
import { formatDay } from "@/lib/dates";

const CELL = 11;
const GAP = 3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FILL = [
  "var(--surface-2)",
  "color-mix(in srgb, var(--easy) 35%, var(--surface-2))",
  "color-mix(in srgb, var(--easy) 60%, var(--surface-2))",
  "color-mix(in srgb, var(--easy) 80%, var(--surface-2))",
  "var(--easy)",
];

/** 0 none · 1 under 15m · 2 under 45m · 3 under 2h · 4 two hours or more */
function level(seconds: number) {
  if (seconds <= 0) return 0;
  if (seconds < 15 * 60) return 1;
  if (seconds < 45 * 60) return 2;
  if (seconds < 2 * 3600) return 3;
  return 4;
}

const noop = () => () => {};

/** LeetCode-style calendar of active time per day, with a hover / tap tooltip. */
export function HoursHeatmap({
  seconds,
  solves,
  today,
}: {
  seconds: Record<string, number>;
  solves: Record<string, number>;
  today: string;
}) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const [hover, setHover] = useState<{ day: string; x: number; y: number } | null>(null);

  const { weeks, months } = useMemo(() => {
    const start = addDays(today, -52 * 7 - weekday(today)); // a Sunday ~a year ago
    const weeks: string[][] = [];
    const months: { col: number; label: string }[] = [];
    for (let d = start, col = 0; d <= today; col++) {
      const week: string[] = [];
      for (let i = 0; i < 7 && d <= today; i++, d = addDays(d, 1)) {
        week.push(d);
        if (d.endsWith("-01") && (!months.length || months[months.length - 1].col < col - 2))
          months.push({ col, label: MONTHS[Number(d.slice(5, 7)) - 1] });
      }
      weeks.push(week);
    }
    return { weeks, months };
  }, [today]);

  if (!isClient) return <div className="skeleton h-36 w-full" />;
  const width = weeks.length * (CELL + GAP);

  return (
    <div className="relative">
      <div
        className="overflow-x-auto pb-1"
        ref={(el) => {
          if (el) el.scrollLeft = el.scrollWidth; // most recent weeks first on phones
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${7 * (CELL + GAP) + 16}`}
          className="block h-auto w-full min-w-120"
          role="img"
          aria-label="Active time per day over the past year"
          onMouseLeave={() => setHover(null)}
        >
          {months.map((m) => (
            <text key={`${m.col}-${m.label}`} x={m.col * (CELL + GAP)} y={10} fontSize={10} fill="var(--muted)">
              {m.label}
            </text>
          ))}
          {weeks.map((week, wi) =>
            week.map((day) => {
              const di = weekday(day);
              const on = hover?.day === day;
              return (
                <rect
                  key={day}
                  x={wi * (CELL + GAP)}
                  y={16 + di * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={FILL[level(seconds[day] ?? 0)]}
                  stroke={on ? "var(--fg)" : "none"}
                  strokeWidth={1}
                  style={{ transition: "fill 300ms ease" }}
                  onMouseEnter={(e) => {
                    const box = (e.currentTarget.ownerSVGElement!.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover({ day, x: r.left - box.left + r.width / 2, y: r.top - box.top });
                  }}
                  onClick={(e) => {
                    const box = (e.currentTarget.ownerSVGElement!.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
                    const r = e.currentTarget.getBoundingClientRect();
                    setHover((h) => (h?.day === day ? null : { day, x: r.left - box.left + r.width / 2, y: r.top - box.top }));
                  }}
                />
              );
            }),
          )}
        </svg>
      </div>

      {hover && (
        <div
          className="page-enter pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: Math.max(70, hover.x), top: hover.y - 6 }}
        >
          <div className="font-semibold">{formatDuration(seconds[hover.day] ?? 0)} active</div>
          <div className="text-muted">
            {formatDay(hover.day)}
            {solves[hover.day] ? ` · ${solves[hover.day]} solved` : ""}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted">
        Less
        {FILL.map((f, i) => (
          <span key={i} className="inline-block h-2.5 w-2.5 rounded-xs" style={{ background: f }} />
        ))}
        More
      </div>
    </div>
  );
}
