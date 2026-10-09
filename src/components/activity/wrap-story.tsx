"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { formatDuration, type Wrap } from "@/lib/activity";
import { formatDay } from "@/lib/dates";

const SLIDE_MS = 5200;

// Each slide gets its own soft gradient; text stays white for contrast in both themes.
const BG = [
  "linear-gradient(150deg, #ff8a00 0%, #e5484d 100%)",
  "linear-gradient(150deg, #6d28d9 0%, #db2777 100%)",
  "linear-gradient(150deg, #0f766e 0%, #0891b2 100%)",
  "linear-gradient(150deg, #1d4ed8 0%, #7c3aed 100%)",
  "linear-gradient(150deg, #be123c 0%, #f59e0b 100%)",
  "linear-gradient(150deg, #111827 0%, #374151 100%)",
];

function Big({ children }: { children: ReactNode }) {
  return <div className="text-5xl font-black leading-none tracking-tight sm:text-6xl">{children}</div>;
}
function Kicker({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold uppercase tracking-widest text-white/75">{children}</div>;
}

function slides(w: Wrap): ReactNode[] {
  const period = w.kind === "week" ? "week" : "month";
  const out: ReactNode[] = [
    <>
      <Kicker>Your {period} wrapped</Kicker>
      <Big>{w.title}</Big>
      <p className="text-lg text-white/85">Here&apos;s how your practice went. Tap to continue.</p>
    </>,
    <>
      <Kicker>Time practising</Kicker>
      <Big>{formatDuration(w.seconds)}</Big>
      <p className="text-lg text-white/85">
        Active on <b>{w.activeDays}</b> of {w.totalDays} days
        {w.streak > 1 ? (
          <>
            , with a <b>{w.streak}-day</b> streak
          </>
        ) : null}
        .
      </p>
    </>,
  ];
  if (w.busiestDay)
    out.push(
      <>
        <Kicker>Your power day</Kicker>
        <Big>{formatDay(w.busiestDay.day).split(",")[0]}</Big>
        <p className="text-lg text-white/85">
          {formatDay(w.busiestDay.day)}: <b>{formatDuration(w.busiestDay.seconds)}</b> on the site.
        </p>
      </>,
    );
  out.push(
    <>
      <Kicker>Questions solved</Kicker>
      <Big>{w.solved}</Big>
      <div className="w-full max-w-xs space-y-2">
        {(["easy", "medium", "hard"] as const).map((d) => (
          <div key={d} className="flex items-center gap-3 text-sm">
            <span className="w-16 capitalize text-white/85">{d}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${w.solved ? (w.byDifficulty[d] / w.solved) * 100 : 0}%`, transition: "width 700ms ease" }}
              />
            </div>
            <b className="w-6 text-right">{w.byDifficulty[d]}</b>
          </div>
        ))}
      </div>
    </>,
  );
  if (w.topTopics.length)
    out.push(
      <>
        <Kicker>Your top topics</Kicker>
        <ol className="w-full max-w-xs space-y-2 text-left">
          {w.topTopics.map((t, i) => (
            <li key={t.name} className="flex items-baseline gap-3">
              <span className="w-6 text-2xl font-black text-white/60">{i + 1}</span>
              <span className="flex-1 text-xl font-bold">{t.name}</span>
              {t.seconds > 0 && <span className="text-sm text-white/80">{formatDuration(t.seconds)}</span>}
            </li>
          ))}
        </ol>
        {w.topQuestion && (
          <p className="text-sm text-white/80">
            Most time on <b>{w.topQuestion.title}</b> ({formatDuration(w.topQuestion.seconds)})
          </p>
        )}
      </>,
    );
  out.push(
    <>
      <Kicker>{w.title}</Kicker>
      <div className="grid w-full max-w-xs grid-cols-2 gap-3 text-left">
        {[
          ["Time", formatDuration(w.seconds)],
          ["Solved", String(w.solved)],
          ["Active days", `${w.activeDays}/${w.totalDays}`],
          ["Best streak", `${w.streak}d`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/15 p-3">
            <div className="text-xs uppercase tracking-wider text-white/70">{k}</div>
            <div className="text-2xl font-black">{v}</div>
          </div>
        ))}
      </div>
      {w.topTopics[0] && (
        <p className="text-white/85">
          Top topic: <b>{w.topTopics[0].name}</b>
        </p>
      )}
      <p className="text-sm text-white/70">Keep it going! See all your wraps on the Activity page.</p>
    </>,
  );
  return out;
}

/** Story-style wrap, opened only when the viewer clicks. Esc / × closes; tap sides to move. */
export function WrapStory({ wrap, onClose }: { wrap: Wrap; onClose: () => void }) {
  const all = slides(wrap);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setI((n) => (n < all.length - 1 ? n + 1 : n)), [all.length]);
  const prev = () => setI((n) => Math.max(0, n - 1));

  useEffect(() => {
    if (paused || i >= all.length - 1) return;
    const t = setTimeout(next, SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, next, all.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, next]);

  return (
    <div
      className="wrap-backdrop fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${wrap.title} wrap`}
    >
      <div
        className="wrap-card relative flex h-[min(640px,88vh)] w-full max-w-sm flex-col overflow-hidden rounded-3xl text-white shadow-2xl"
        style={{ background: BG[i % BG.length], transition: "background 600ms ease" }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      >
        {/* progress segments */}
        <div className="flex gap-1 px-4 pt-4">
          {all.map((_, n) => (
            <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                key={`${n}-${i}`}
                className={`h-full bg-white ${n === i && !paused ? "wrap-progress" : ""}`}
                style={{
                  width: n < i ? "100%" : n === i ? undefined : "0%",
                  animationDuration: `${SLIDE_MS}ms`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pt-3 text-xs font-semibold uppercase tracking-wider text-white/80">
          <span>Murali Sir · {wrap.kind === "week" ? "Weekly" : "Monthly"} wrap</span>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/20" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div key={i} className="page-enter flex flex-1 flex-col items-center justify-center gap-5 px-7 pb-10 text-center">
          {all[i]}
        </div>

        {/* tap zones */}
        <button className="absolute bottom-0 left-0 top-20 w-1/3" onClick={prev} aria-label="Previous" />
        <button className="absolute bottom-0 right-0 top-20 w-2/3" onClick={next} aria-label="Next" />
      </div>
    </div>
  );
}
