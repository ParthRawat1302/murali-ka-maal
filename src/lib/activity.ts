import type { Difficulty } from "./types";

// Pure helpers for the Activity page and the weekly / monthly wraps. Dates are IST YYYY-MM-DD strings.

export type ActivityRow = { day: string; question_id: string | null; seconds: number };
export type SolveRow = { question_id: string; solved_at: string };
export type ActivityQuestion = { id: string; title: string; difficulty: Difficulty; topics: string[] };

/** Topic tracks shown on the Activity page: LeetCode tags grouped the way the course teaches them. */
export const TRACKS: { name: string; subtopics: string[] }[] = [
  { name: "Arrays & Strings", subtopics: ["Array", "String", "Two Pointers", "Sliding Window", "Prefix Sum", "Matrix", "Simulation", "Counting", "Enumeration"] },
  { name: "Hashing", subtopics: ["Hash Table", "Hash Function", "Rolling Hash"] },
  { name: "Linked Lists", subtopics: ["Linked List", "Doubly-Linked List", "Floyd's Cycle Finding Algorithm"] },
  { name: "Stacks & Queues", subtopics: ["Stack", "Monotonic Stack", "Queue", "Monotonic Queue"] },
  { name: "Trees", subtopics: ["Tree", "Binary Tree", "Binary Search Tree", "Depth-First Search", "Breadth-First Search", "Lowest Common Ancestor", "Binary Lifting", "Cartesian Tree", "Trie"] },
  { name: "Heaps", subtopics: ["Heap (Priority Queue)", "Data Stream", "Design"] },
  { name: "Range Queries", subtopics: ["Segment Tree", "Binary Indexed Tree", "Ordered Set", "Treap", "Range Minimum/Maximum Query", "K-D Tree"] },
  { name: "Searching & Sorting", subtopics: ["Binary Search", "Sorting", "Merge Sort", "Quicksort", "Quickselect", "Divide and Conquer", "Counting Sort", "Bucket Sort"] },
  { name: "Math", subtopics: ["Math", "Number Theory", "Bit Manipulation", "Matrix Exponentiation", "Combinatorics", "Geometry", "Inclusion-Exclusion Principle", "Least Common Multiple", "Boyer–Moore Majority Vote Algorithm"] },
  { name: "Greedy & DP", subtopics: ["Greedy", "Dynamic Programming", "Memoization", "Recursion", "Backtracking", "Brute-Force Search"] },
  { name: "Graphs", subtopics: ["Graph", "Graph Theory", "Topological Sort", "Union Find", "Shortest Path", "Minimum Spanning Tree"] },
];

export function formatDuration(seconds: number) {
  if (seconds < 60) return seconds > 0 ? "<1m" : "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function istDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** YYYY-MM-DD arithmetic in UTC so it never depends on the machine's time zone. */
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(day: string) {
  return new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}

export function secondsByDay(rows: ActivityRow[]) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.day, (m.get(r.day) ?? 0) + r.seconds);
  return m;
}

export function solvesByDay(solves: SolveRow[]) {
  const m = new Map<string, number>();
  for (const s of solves) {
    const d = istDay(s.solved_at);
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

/** Longest run of consecutive active days in a sorted-or-not list of days. */
export function longestStreak(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && addDays(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export function currentStreak(activeDays: Set<string>, today: string) {
  let d = activeDays.has(today) ? today : addDays(today, -1); // today isn't over yet
  let n = 0;
  while (activeDays.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export type SubtopicStat = { name: string; seconds: number; solved: number; total: number };
export type TrackStat = SubtopicStat & { subtopics: SubtopicStat[] };

/**
 * Time and progress per track and subtopic. Time on a question counts toward each of its topics
 * (and once toward each track it belongs to). Progress is solved / questions with that topic.
 */
export function trackStats(rows: ActivityRow[], solved: Set<string>, questions: ActivityQuestion[]): TrackStat[] {
  const qSeconds = new Map<string, number>();
  for (const r of rows) if (r.question_id) qSeconds.set(r.question_id, (qSeconds.get(r.question_id) ?? 0) + r.seconds);

  const known = new Set(TRACKS.flatMap((t) => t.subtopics.map((s) => s.toLowerCase())));
  const other = [...new Set(questions.flatMap((q) => q.topics))].filter((t) => !known.has(t.toLowerCase())).sort();
  const tracks = other.length ? [...TRACKS, { name: "Other", subtopics: other }] : TRACKS;

  return tracks
    .map((t) => {
      const subs = t.subtopics.map((name) => {
        const qs = questions.filter((q) => q.topics.some((x) => x.toLowerCase() === name.toLowerCase()));
        return {
          name,
          seconds: qs.reduce((s, q) => s + (qSeconds.get(q.id) ?? 0), 0),
          solved: qs.filter((q) => solved.has(q.id)).length,
          total: qs.length,
        };
      });
      const lower = new Set(t.subtopics.map((s) => s.toLowerCase()));
      const qs = questions.filter((q) => q.topics.some((x) => lower.has(x.toLowerCase())));
      return {
        name: t.name,
        seconds: qs.reduce((s, q) => s + (qSeconds.get(q.id) ?? 0), 0),
        solved: qs.filter((q) => solved.has(q.id)).length,
        total: qs.length,
        subtopics: subs.filter((s) => s.total > 0).sort((a, b) => b.total - a.total),
      };
    })
    .filter((t) => t.total > 0);
}

// ───────── wraps ─────────

export type WrapPeriod = { key: string; kind: "week" | "month"; start: string; end: string; title: string };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = (d: string) => {
  const [, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1].slice(0, 3)}`;
};

/**
 * Finished periods only: a week (Sunday–Saturday) is ready from the next Sunday,
 * a month from the 1st of the next month. Newest first.
 */
export function finishedWraps(firstDay: string, today: string): WrapPeriod[] {
  const out: WrapPeriod[] = [];
  // weeks
  let start = addDays(today, -weekday(today) - 7); // last week's Sunday
  while (addDays(start, 6) >= firstDay) {
    const end = addDays(start, 6);
    out.push({ key: `week-${start}`, kind: "week", start, end, title: `Week of ${SHORT(start)} – ${SHORT(end)}` });
    start = addDays(start, -7);
  }
  // months
  let [y, m] = today.split("-").map(Number);
  for (;;) {
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    const s = `${y}-${String(m).padStart(2, "0")}-01`;
    const e = addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`, -1);
    if (e < firstDay) break;
    out.push({ key: `month-${s.slice(0, 7)}`, kind: "month", start: s, end: e, title: `${MONTHS[m - 1]} ${y}` });
  }
  return out.sort((a, b) => b.end.localeCompare(a.end) || (a.kind === "month" ? -1 : 1));
}

export type Wrap = WrapPeriod & {
  seconds: number;
  activeDays: number;
  totalDays: number;
  solved: number;
  byDifficulty: Record<Difficulty, number>;
  busiestDay: { day: string; seconds: number } | null;
  streak: number;
  topTopics: { name: string; seconds: number }[];
  topQuestion: { title: string; seconds: number } | null;
};

export function computeWrap(
  p: WrapPeriod,
  rows: ActivityRow[],
  solves: SolveRow[],
  questions: ActivityQuestion[],
): Wrap {
  const inRange = (d: string) => d >= p.start && d <= p.end;
  const r = rows.filter((x) => inRange(x.day));
  const byDay = secondsByDay(r);
  const sv = solves.filter((s) => inRange(istDay(s.solved_at)));
  const qById = new Map(questions.map((q) => [q.id, q]));

  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const s of sv) {
    const q = qById.get(s.question_id);
    if (q) byDifficulty[q.difficulty]++;
  }

  const topicSecs = new Map<string, number>();
  const qSecs = new Map<string, number>();
  for (const x of r) {
    if (!x.question_id) continue;
    qSecs.set(x.question_id, (qSecs.get(x.question_id) ?? 0) + x.seconds);
    for (const t of qById.get(x.question_id)?.topics ?? []) topicSecs.set(t, (topicSecs.get(t) ?? 0) + x.seconds);
  }
  // topics of questions solved in the period count too, so a wrap isn't empty for quick solvers
  for (const s of sv) for (const t of qById.get(s.question_id)?.topics ?? []) if (!topicSecs.has(t)) topicSecs.set(t, 0);

  const busiest = [...byDay].sort((a, b) => b[1] - a[1])[0];
  const topQ = [...qSecs].sort((a, b) => b[1] - a[1])[0];
  const activeDays = [...byDay].filter(([, s]) => s > 0).map(([d]) => d);
  for (const s of sv) activeDays.push(istDay(s.solved_at));

  return {
    ...p,
    seconds: [...byDay.values()].reduce((a, b) => a + b, 0),
    activeDays: new Set(activeDays).size,
    totalDays: Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86400000) + 1,
    solved: sv.length,
    byDifficulty,
    busiestDay: busiest && busiest[1] > 0 ? { day: busiest[0], seconds: busiest[1] } : null,
    streak: longestStreak(activeDays),
    topTopics: [...topicSecs]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, seconds]) => ({ name, seconds })),
    topQuestion: topQ && topQ[1] > 0 ? { title: qById.get(topQ[0])?.title ?? "A question", seconds: topQ[1] } : null,
  };
}

export const isEmptyWrap = (w: Wrap) => w.seconds < 60 && w.solved === 0;
