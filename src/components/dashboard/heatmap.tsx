"use client";

import { useMemo, useSyncExternalStore } from "react";
import { dayKey, formatDay } from "@/lib/dates";

export type ActivityDay = { day: string; solves: number; edits: number };

const CELL = 11;
const GAP = 3;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function level(n: number) {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}
const FILL = [
  "var(--surface-2)",
  "color-mix(in srgb, var(--easy) 35%, var(--surface-2))",
  "color-mix(in srgb, var(--easy) 60%, var(--surface-2))",
  "color-mix(in srgb, var(--easy) 80%, var(--surface-2))",
  "var(--easy)",
];

const noop = () => () => {};

/** LeetCode-style activity calendar for the last ~52 weeks. */
export function Heatmap({ days }: { days: ActivityDay[] }) {
  // "Today" depends on the viewer's clock, so render only in the browser.
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  if (!isClient) return <div className="card h-47" />;
  return <HeatmapInner days={days} />;
}

function HeatmapInner({ days }: { days: ActivityDay[] }) {
  const { weeks, monthLabels, stats } = useMemo(() => {
    const byDay = new Map(days.map((d) => [d.day, d]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 52 * 7 - today.getDay()); // start on a Sunday

    const weeks: { key: string; count: number; d: ActivityDay | undefined; future: boolean }[][] = [];
    const monthLabels: { col: number; label: string }[] = [];
    const cur = new Date(start);
    let col = 0;
    while (cur <= today) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const key = dayKey(cur);
        const d = byDay.get(key);
        week.push({ key, d, count: (d?.solves ?? 0) + (d?.edits ?? 0), future: cur > today });
        if (cur.getDate() === 1 || (col === 0 && i === 0)) {
          if (!monthLabels.length || monthLabels[monthLabels.length - 1].col < col - 2)
            monthLabels.push({ col, label: MONTHS[cur.getMonth()] });
        }
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
      col++;
    }

    // streaks
    const active = new Set(days.filter((d) => d.solves + d.edits > 0).map((d) => d.day));
    let current = 0;
    const probe = new Date(today);
    if (!active.has(dayKey(probe))) probe.setDate(probe.getDate() - 1); // today not over yet
    while (active.has(dayKey(probe))) {
      current++;
      probe.setDate(probe.getDate() - 1);
    }
    let max = 0;
    let run = 0;
    const sorted = [...active].sort();
    let prev: Date | null = null;
    for (const k of sorted) {
      const [y, m, d] = k.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      run = prev && Math.round((dt.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
      max = Math.max(max, run);
      prev = dt;
    }
    const solves = days.reduce((s, d) => s + d.solves, 0);
    return { weeks, monthLabels, stats: { activeDays: active.size, current, max, solves } };
  }, [days]);

  const width = weeks.length * (CELL + GAP);
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span>
          <b className="text-base">{stats.solves}</b> <span className="text-muted">solved in the past year</span>
        </span>
        <span className="text-muted">
          Active days: <b className="text-fg">{stats.activeDays}</b>
        </span>
        <span className="text-muted">
          Current streak: <b className="text-fg">{stats.current}</b>
        </span>
        <span className="text-muted">
          Max streak: <b className="text-fg">{stats.max}</b>
        </span>
      </div>
      <div
        className="overflow-x-auto pb-1"
        ref={(el) => {
          // show the most recent weeks first on narrow screens
          if (el) el.scrollLeft = el.scrollWidth;
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${7 * (CELL + GAP) + 16}`}
          className="block h-auto w-full min-w-120"
          role="img"
          aria-label="Activity over the past year"
        >
          {monthLabels.map((m) => (
            <text key={`${m.col}-${m.label}`} x={m.col * (CELL + GAP)} y={10} fontSize={10} fill="var(--muted)">
              {m.label}
            </text>
          ))}
          {weeks.map((week, wi) =>
            week.map((cell, di) =>
              cell.future ? null : (
                <rect
                  key={cell.key}
                  x={wi * (CELL + GAP)}
                  y={16 + di * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={FILL[level(cell.count)]}
                >
                  <title>
                    {`${formatDay(cell.key)}: ${cell.d?.solves ?? 0} solved, ${cell.d?.edits ?? 0} edits`}
                  </title>
                </rect>
              ),
            ),
          )}
        </svg>
      </div>
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
