import { appearances } from "@/lib/types";
import type { Difficulty, QuestionListItem, SourceType } from "@/lib/types";

export type Sort = "date_desc" | "date_asc" | "difficulty" | "title";
export type Status = "all" | "solved" | "unsolved";

export type Filters = {
  q: string;
  diff: Difficulty[];
  topics: string[];
  topicMode: "any" | "all";
  src: SourceType[];
  label: string;
  from: string;
  to: string;
  status: Status;
  sort: Sort;
};

export const EMPTY: Filters = {
  q: "",
  diff: [],
  topics: [],
  topicMode: "any",
  src: [],
  label: "",
  from: "",
  to: "",
  status: "all",
  sort: "date_desc",
};

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function readFilters(p: URLSearchParams): Filters {
  return {
    q: p.get("q") ?? "",
    diff: list(p.get("diff")) as Difficulty[],
    topics: list(p.get("topics")),
    topicMode: p.get("tm") === "all" ? "all" : "any",
    src: list(p.get("src")) as SourceType[],
    label: p.get("label") ?? "",
    from: p.get("from") ?? "",
    to: p.get("to") ?? "",
    status: (["solved", "unsolved"].includes(p.get("status") ?? "") ? p.get("status") : "all") as Status,
    sort: (["date_asc", "difficulty", "title"].includes(p.get("sort") ?? "") ? p.get("sort") : "date_desc") as Sort,
  };
}

export function writeFilters(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.diff.length) p.set("diff", f.diff.join(","));
  if (f.topics.length) p.set("topics", f.topics.join(","));
  if (f.topicMode === "all") p.set("tm", "all");
  if (f.src.length) p.set("src", f.src.join(","));
  if (f.label) p.set("label", f.label);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.status !== "all") p.set("status", f.status);
  if (f.sort !== "date_desc") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function isFiltered(f: Filters) {
  return writeFilters({ ...f, sort: "date_desc" }) !== "";
}

const DIFF_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function applyFilters(items: QuestionListItem[], f: Filters, solved: Set<string>) {
  const q = f.q.trim().toLowerCase();
  const topics = f.topics.map((t) => t.toLowerCase());
  const out = items.filter((it) => {
    if (q && !it.title.toLowerCase().includes(q)) return false;
    if (f.diff.length && !f.diff.includes(it.difficulty)) return false;
    if (topics.length) {
      const has = new Set(it.topics.map((t) => t.toLowerCase()));
      if (f.topicMode === "all" ? !topics.every((t) => has.has(t)) : !topics.some((t) => has.has(t))) return false;
    }
    // a question given again later (another email, DomJudge set, class) matches that source too;
    // source, label and date must all hold for the same appearance
    if (f.src.length || f.label || f.from || f.to) {
      const ok = appearances(it).some(
        (a) =>
          (!f.src.length || f.src.includes(a.source_type)) &&
          (!f.label || (a.source_label ?? "") === f.label) &&
          (!f.from || a.source_date >= f.from) &&
          (!f.to || a.source_date <= f.to),
      );
      if (!ok) return false;
    }
    if (f.status === "solved" && !solved.has(it.id)) return false;
    if (f.status === "unsolved" && solved.has(it.id)) return false;
    return true;
  });

  const byDate = (a: QuestionListItem, b: QuestionListItem) =>
    a.source_date.localeCompare(b.source_date) || a.created_at.localeCompare(b.created_at);
  switch (f.sort) {
    case "date_asc":
      return out.sort(byDate);
    case "difficulty":
      return out.sort((a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || byDate(b, a));
    case "title":
      return out.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return out.sort((a, b) => byDate(b, a));
  }
}
