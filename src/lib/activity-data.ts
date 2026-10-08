import "server-only";
import { supabaseServer } from "./supabase/server";
import { todayIST } from "./dates";
import {
  addDays,
  computeWrap,
  finishedWraps,
  isEmptyWrap,
  istDay,
  type ActivityQuestion,
  type ActivityRow,
  type SolveRow,
} from "./activity";

/** Everything the Activity page and wraps need for one member (RLS keeps it to their own rows). */
export async function loadActivity(userId: string) {
  const supabase = await supabaseServer();
  const [act, prog, qs, seen] = await Promise.all([
    supabase.from("activity_log").select("day, question_id, seconds").eq("user_id", userId),
    supabase.from("progress").select("question_id, solved_at").eq("user_id", userId).eq("solved", true),
    supabase.from("question_list").select("id, title, difficulty, topics"),
    supabase.from("wrap_views").select("wrap_key").eq("user_id", userId),
  ]);
  const rows = (act.data ?? []) as ActivityRow[];
  const solves = ((prog.data ?? []) as { question_id: string; solved_at: string | null }[]).filter(
    (s): s is SolveRow => !!s.solved_at,
  );
  const questions = (qs.data ?? []) as ActivityQuestion[];
  const today = todayIST();
  const days = [...rows.map((r) => r.day), ...solves.map((s) => istDay(s.solved_at))].sort();
  const firstDay = days[0] ?? today;
  const wraps = finishedWraps(firstDay, today).map((p) => computeWrap(p, rows, solves, questions));
  return {
    rows,
    solves,
    questions,
    today,
    wraps: wraps.filter((w) => !isEmptyWrap(w)),
    seen: new Set((seen.data ?? []).map((s) => s.wrap_key)),
  };
}

/** The newest weekly and monthly wrap, if the member hasn't opened or dismissed it yet. */
export async function pendingWraps(userId: string) {
  const { wraps, seen, today } = await loadActivity(userId);
  const latestWeek = wraps.find((w) => w.kind === "week");
  const latestMonth = wraps.find((w) => w.kind === "month");
  // only announce recent ones: a week wrap during its following week, a month wrap for 10 days
  const fresh = (w: (typeof wraps)[number]) =>
    w.kind === "week" ? w.end >= addDays(today, -7) : w.end >= addDays(today, -11);
  return [latestMonth, latestWeek].filter((w): w is NonNullable<typeof w> => !!w && !seen.has(w.key) && fresh(w));
}

