"use client";

import { useState } from "react";
import { CalendarDays, CalendarRange, ChevronDown, Play } from "lucide-react";
import { formatDuration, type TrackStat, type Wrap } from "@/lib/activity";
import { markWrapSeen } from "./wrap-banner";
import { WrapStory } from "./wrap-story";

function Progress({ solved, total }: { solved: number; total: number }) {
  const pct = total ? (solved / total) * 100 : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-easy" style={{ width: `${pct}%`, transition: "width 600ms ease" }} />
    </div>
  );
}

export function ActivityTracks({ tracks }: { tracks: TrackStat[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="font-semibold">Topic tracks</h2>
        <span className="text-xs text-muted">by each question&apos;s highlighted (intended) topic</span>
      </div>
      <div className="grid items-start gap-3 md:grid-cols-2">
        {tracks.map((t) => {
          const isOpen = open === t.name;
          return (
            <div key={t.name} className="card overflow-hidden">
              <button
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface-2/50"
                onClick={() => setOpen(isOpen ? null : t.name)}
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-sm tabular-nums">
                      <b>{t.solved}</b>
                      <span className="text-muted">/{t.total} done</span>
                    </span>
                  </div>
                  <Progress solved={t.solved} total={t.total} />
                  <div className="text-xs text-muted">{formatDuration(t.seconds)} spent</div>
                </div>
                <ChevronDown size={16} className={`shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <ul className="page-enter divide-y divide-border border-t border-border bg-surface-2/30">
                  {t.subtopics.map((s) => (
                    <li key={s.name} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-32 shrink-0 truncate sm:w-40" title={s.name}>
                        {s.name}
                      </span>
                      <div className="flex-1">
                        <Progress solved={s.solved} total={s.total} />
                      </div>
                      <span className="w-12 text-right tabular-nums">
                        {s.solved}
                        <span className="text-muted">/{s.total}</span>
                      </span>
                      <span className="w-14 text-right text-xs text-muted">{formatDuration(s.seconds)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function WrapList({ wraps }: { wraps: Wrap[] }) {
  const [open, setOpen] = useState<Wrap | null>(null);
  const [kind, setKind] = useState<"week" | "month">("week");
  const shown = wraps.filter((w) => w.kind === kind);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="font-semibold">Your wraps</h2>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-0.5 text-xs">
          {(["week", "month"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md px-2.5 py-1 transition ${kind === k ? "bg-surface font-medium text-fg shadow-sm" : "text-muted"}`}
            >
              {k === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">
          No {kind === "week" ? "weekly" : "monthly"} wraps yet. A weekly wrap arrives every Sunday, a monthly one on
          the 1st.
        </p>
      ) : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {shown.map((w) => (
            <button
              key={w.key}
              onClick={() => {
                setOpen(w);
                markWrapSeen(w.key);
              }}
              className="group relative w-44 shrink-0 snap-start overflow-hidden rounded-2xl p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{
                background:
                  w.kind === "week"
                    ? "linear-gradient(150deg, #ff8a00 0%, #e5484d 100%)"
                    : "linear-gradient(150deg, #6d28d9 0%, #db2777 100%)",
              }}
            >
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
                {w.kind === "week" ? <CalendarDays size={12} /> : <CalendarRange size={12} />}
                {w.kind === "week" ? "Weekly" : "Monthly"}
              </div>
              <div className="mt-1 text-sm font-bold leading-tight">{w.title}</div>
              <div className="mt-4 text-2xl font-black">{formatDuration(w.seconds)}</div>
              <div className="text-xs text-white/80">{w.solved} solved</div>
              <Play size={16} className="absolute bottom-4 right-4 opacity-70 transition group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}
      {open && <WrapStory wrap={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
