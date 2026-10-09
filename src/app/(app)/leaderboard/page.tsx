import type { Metadata } from "next";
import { Crown, Medal } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { timeAgo } from "@/lib/dates";
import { POINTS, score } from "@/lib/score";
import { supabaseServer } from "@/lib/supabase/server";
import type { Difficulty } from "@/lib/types";

export const metadata: Metadata = { title: "Leaderboard · Murali Sir" };

type Row = { user_id: string; display_name: string; last_solved_at: string | null } & Record<Difficulty, number>;

const DIFFS: { key: Difficulty; label: string; text: string; bg: string }[] = [
  { key: "easy", label: "Easy", text: "text-easy", bg: "bg-easy" },
  { key: "medium", label: "Medium", text: "text-medium", bg: "bg-medium" },
  { key: "hard", label: "Hard", text: "text-hard", bg: "bg-hard" },
];

export default async function LeaderboardPage() {
  const profile = await requireProfile();
  const supabase = await supabaseServer();
  const [{ data: rows, error }, { data: questions }] = await Promise.all([
    supabase.rpc("leaderboard"),
    supabase.from("questions").select("difficulty"),
  ]);
  if (error) throw error;

  const totals = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions ?? []) totals[q.difficulty as Difficulty]++;
  const maxScore = score(totals);
  const totalQuestions = totals.easy + totals.medium + totals.hard;

  const ranked = ((rows ?? []) as Row[])
    .map((r) => ({ ...r, solved: r.easy + r.medium + r.hard, score: score(r) }))
    // ties: more solved first, then whoever got there first
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.solved - a.solved ||
        (a.last_solved_at ?? "9").localeCompare(b.last_solved_at ?? "9") ||
        a.display_name.localeCompare(b.display_name),
    );
  // equal score + equal solved share a rank
  const ranks = ranked.map((r, i, all) => {
    let j = i;
    while (j > 0 && all[j - 1].score === r.score && all[j - 1].solved === r.solved) j--;
    return j + 1;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted">
            {totalQuestions} questions · max score {maxScore}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {DIFFS.map((d) => (
            <span key={d.key} className="chip">
              <span className={d.text}>{d.label}</span>&nbsp;= {POINTS[d.key]} pt{POINTS[d.key] === 1 ? "" : "s"}
            </span>
          ))}
        </div>
      </div>

      <ol className="space-y-2">
        {ranked.map((r, i) => {
          const rank = ranks[i];
          const me = r.user_id === profile.id;
          const pct = maxScore ? (r.score / maxScore) * 100 : 0;
          return (
            <li
              key={r.user_id}
              className={`card flex items-center gap-3 p-3 sm:gap-4 sm:p-4 ${me ? "ring-2 ring-accent/60" : ""}`}
            >
              <RankBadge rank={rank} medal={r.score > 0} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold">
                    {r.display_name}
                    {me && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums">
                    {r.score}
                    <span className="ml-1 text-xs font-normal text-muted">pts</span>
                  </span>
                </div>

                {/* score bar split by difficulty */}
                <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2" title={`${Math.round(pct)}% of max score`}>
                  {DIFFS.map((d) => (
                    <div
                      key={d.key}
                      className={d.bg}
                      style={{ width: `${maxScore ? ((r[d.key] * POINTS[d.key]) / maxScore) * 100 : 0}%` }}
                    />
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  <span>
                    <b className="text-fg">{r.solved}</b>/{totalQuestions} solved
                  </span>
                  {DIFFS.map((d) => (
                    <span key={d.key}>
                      <span className={d.text}>{d.label}</span> <b className="text-fg">{r[d.key]}</b>/{totals[d.key]}
                    </span>
                  ))}
                  {r.last_solved_at && <span className="ml-auto hidden sm:inline">last solve {timeAgo(r.last_solved_at)}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RankBadge({ rank, medal }: { rank: number; medal: boolean }) {
  if (medal && rank === 1)
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent" title="1st">
        <Crown size={18} />
      </span>
    );
  if (medal && rank <= 3)
    return (
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 ${rank === 2 ? "text-muted" : "text-medium"}`}
        title={rank === 2 ? "2nd" : "3rd"}
      >
        <Medal size={18} />
      </span>
    );
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
      {rank}
    </span>
  );
}
