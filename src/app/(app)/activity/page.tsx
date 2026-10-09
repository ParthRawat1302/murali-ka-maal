import type { Metadata } from "next";
import { HoursHeatmap } from "@/components/activity/hours-heatmap";
import { ActivityTracks, WrapList } from "@/components/activity/activity-view";
import { SessionLog } from "@/components/activity/session-log";
import {
  addDays,
  currentStreak,
  formatDuration,
  istDay,
  longestStreak,
  secondsByDay,
  solvesByDay,
  trackStats,
} from "@/lib/activity";
import { loadActivity } from "@/lib/activity-data";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Your activity · Murali Sir" };

export default async function ActivityPage() {
  const profile = await requireProfile();
  const { rows, solves, questions, today, wraps } = await loadActivity(profile.id);

  const secs = secondsByDay(rows);
  const solved = solvesByDay(solves);
  const activeDays = new Set([...[...secs].filter(([, s]) => s > 0).map(([d]) => d), ...solved.keys()]);
  const total = [...secs.values()].reduce((a, b) => a + b, 0);
  const weekStart = addDays(today, -6);
  const last7 = [...secs].filter(([d]) => d >= weekStart).reduce((a, [, s]) => a + s, 0);
  const tracks = trackStats(rows, new Set(solves.map((s) => s.question_id)), questions);
  const solvedThisYear = solves.filter((s) => istDay(s.solved_at) >= addDays(today, -365)).length;

  const stats = [
    { label: "Total time active", value: formatDuration(total) },
    { label: "Days active", value: String(activeDays.size) },
    { label: "Last 7 days", value: formatDuration(last7) },
    { label: "Avg per active day", value: formatDuration(activeDays.size ? Math.round(total / activeDays.size) : 0) },
    { label: "Current streak", value: `${currentStreak(activeDays, today)}d` },
    { label: "Best streak", value: `${longestStreak([...activeDays])}d` },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your activity</h1>
        <p className="mt-1 text-sm text-muted">
          Time counts while this site is open in front of you and you&apos;ve used it in the last 5 minutes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card p-3">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <h2 className="font-semibold">Active time per day</h2>
          <span className="text-muted">{solvedThisYear} solved in the past year · hover or tap a day</span>
        </div>
        <HoursHeatmap seconds={Object.fromEntries(secs)} solves={Object.fromEntries(solved)} today={today} />
      </section>

      <WrapList wraps={wraps} />

      <ActivityTracks tracks={tracks} />

      <SessionLog userId={profile.id} />
    </div>
  );
}
