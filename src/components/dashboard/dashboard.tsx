"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, FileText, NotebookPen, Repeat, Search, SlidersHorizontal, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { dayKey, formatDay } from "@/lib/dates";
import { appearances, DIFFICULTIES, SOURCE_TYPES, sourceTypeLabel, type QuestionListItem } from "@/lib/types";
import { DifficultyPill, LeetCodeLogo, SourceBadge } from "@/components/ui";
import { MultiSelect } from "@/components/multi-select";
import { TopicChips } from "@/components/topic-chips";
import { useApp } from "@/components/app-context";
import { StatsRings } from "./stats";
import { Heatmap, type ActivityDay } from "./heatmap";
import { applyFilters, EMPTY, isFiltered, readFilters, toRows, writeFilters, type Filters } from "./filters";

const DIFF_TEXT = { easy: "text-easy", medium: "text-medium", hard: "text-hard" } as const;

export function Dashboard({
  questions,
  solvedIds,
  activity: initialActivity,
  topics,
}: {
  questions: QuestionListItem[];
  solvedIds: string[];
  activity: ActivityDay[];
  topics: string[];
}) {
  const { profile } = useApp();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(params.toString())), [params]);
  const [search, setSearch] = useState(filters.q);
  const deferredSearch = useDeferredValue(search);
  const [solved, setSolved] = useState(() => new Set(solvedIds));
  const [activity, setActivity] = useState(initialActivity);
  const [showFilters, setShowFilters] = useState(isFiltered({ ...filters, q: "" }));

  // Filters live in the URL. Native replaceState keeps useSearchParams in sync without a server round-trip.
  const setUrl = useCallback((f: Filters) => window.history.replaceState(null, "", `${pathname}${writeFilters(f)}`), [pathname]);

  function update(patch: Partial<Filters>) {
    setUrl({ ...filters, q: search, ...patch });
  }

  // keep ?q= in sync with the search box without an update per keystroke
  useEffect(() => {
    if (deferredSearch === filters.q) return;
    const t = setTimeout(() => setUrl({ ...filters, q: deferredSearch }), 300);
    return () => clearTimeout(t);
  }, [deferredSearch, filters, setUrl]);

  const visible = useMemo(
    () => applyFilters(questions, { ...filters, q: deferredSearch }, solved),
    [questions, filters, deferredSearch, solved],
  );

  const counts = useMemo(() => {
    const c = { easy: { total: 0, solved: 0 }, medium: { total: 0, solved: 0 }, hard: { total: 0, solved: 0 } };
    for (const q of questions) {
      c[q.difficulty].total++;
      if (solved.has(q.id)) c[q.difficulty].solved++;
    }
    return c;
  }, [questions, solved]);

  // one option per set, shown as "Email: Problem Set 1", sorted by type then label
  const labels = useMemo(
    () => {
      const byLabel = new Map<string, string>();
      for (const q of questions)
        for (const a of appearances(q))
          if (a.source_label && !byLabel.has(a.source_label)) byLabel.set(a.source_label, sourceTypeLabel(a.source_type));
      return [...byLabel]
        .map(([label, type]) => ({ label, text: `${type}: ${label}`, type }))
        .sort((x, y) => x.type.localeCompare(y.type) || x.label.localeCompare(y.label));
    },
    [questions],
  );
  const usedTopics = useMemo(() => {
    const used = new Set(questions.flatMap((q) => q.topics));
    return [...used, ...topics.filter((t) => !used.has(t))];
  }, [questions, topics]);

  async function toggleSolved(id: string) {
    const now = !solved.has(id);
    setSolved((s) => {
      const n = new Set(s);
      if (now) n.add(id);
      else n.delete(id);
      return n;
    });
    const today = dayKey();
    setActivity((a) => {
      const existing = a.find((d) => d.day === today);
      const delta = now ? 1 : -1;
      if (existing) return a.map((d) => (d.day === today ? { ...d, solves: Math.max(0, d.solves + delta) } : d));
      return now ? [...a, { day: today, solves: 1, edits: 0 }] : a;
    });
    const { error } = await supabaseBrowser()
      .from("progress")
      .upsert({ user_id: profile.id, question_id: id, solved: now });
    if (error) {
      alert(`Couldn't save progress: ${error.message}`);
      setSolved((s) => {
        const n = new Set(s);
        if (now) n.delete(id);
        else n.add(id);
        return n;
      });
    }
  }

  const groupByDate = filters.sort === "date_desc" || filters.sort === "date_asc";
  const rows = useMemo(() => toRows(visible, { ...filters, q: deferredSearch }), [visible, filters, deferredSearch]);
  const anyFilter = isFiltered({ ...filters, q: deferredSearch });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <StatsRings counts={counts} />
        <Heatmap days={activity} />
      </div>

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-48 flex-1 sm:w-auto">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions by name…"
              className="input w-full pl-9"
            />
          </div>
          <div className="flex flex-1 gap-1 sm:flex-none">
            {DIFFICULTIES.map((d) => {
              const on = filters.diff.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => update({ diff: on ? filters.diff.filter((x) => x !== d) : [...filters.diff, d] })}
                  className={`flex-1 rounded-lg border px-2.5 py-1.5 text-sm capitalize transition sm:flex-none ${
                    on ? "border-accent bg-accent/15" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className={DIFF_TEXT[d]}>{d}</span>
                </button>
              );
            })}
          </div>
          <select
            value={filters.status}
            onChange={(e) => update({ status: e.target.value as Filters["status"] })}
            className="input py-1.5"
            aria-label="Status"
          >
            <option value="all">All</option>
            <option value="solved">Solved</option>
            <option value="unsolved">Unsolved</option>
          </select>
          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as Filters["sort"] })}
            className="input py-1.5"
            aria-label="Sort"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="difficulty">Difficulty</option>
            <option value="title">Title A–Z</option>
          </select>
          <button className={`btn ${showFilters ? "bg-surface-2" : ""}`} onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal size={16} /> Filters
          </button>
          {anyFilter && (
            <button
              className="btn-ghost"
              onClick={() => {
                setSearch("");
                setUrl({ ...EMPTY, sort: filters.sort });
              }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Topics</span>
              <MultiSelect
                options={usedTopics}
                value={filters.topics}
                onChange={(v) => update({ topics: v })}
                placeholder="Any topic"
              >
                <div className="mb-1 flex gap-1 px-1 text-xs">
                  {(["any", "all"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => update({ topicMode: m })}
                      className={`rounded px-2 py-0.5 ${filters.topicMode === m ? "bg-accent text-accent-fg" : "bg-surface-2"}`}
                    >
                      Match {m}
                    </button>
                  ))}
                </div>
              </MultiSelect>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Source</span>
              <MultiSelect
                options={SOURCE_TYPES.map((s) => s.label)}
                value={filters.src.map((s) => SOURCE_TYPES.find((x) => x.value === s)!.label)}
                onChange={(v) =>
                  update({ src: v.map((l) => SOURCE_TYPES.find((x) => x.label === l)!.value) })
                }
                placeholder="Any source"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Test / email / label</span>
              <select
                value={filters.label}
                onChange={(e) => update({ label: e.target.value })}
                className="input w-full"
              >
                <option value="">Any</option>
                {labels.map((l) => (
                  <option key={l.label} value={l.label}>
                    {l.text}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted">Date range</span>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => update({ from: e.target.value })}
                  className="input w-full min-w-0 px-2"
                  aria-label="From"
                />
                <span className="text-muted">–</span>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => update({ to: e.target.value })}
                  className="input w-full min-w-0 px-2"
                  aria-label="To"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-1 text-sm text-muted">
        <span>
          {visible.length === questions.length
            ? `${questions.length} question${questions.length === 1 ? "" : "s"}`
            : `${visible.length} of ${questions.length} questions`}
        </span>
        <Link href="/add" className="btn-primary py-1.5">
          + Add question
        </Link>
      </div>

      <div className="card divide-y divide-border overflow-hidden">
        {visible.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            {questions.length ? "No questions match these filters." : "No questions yet. Add the first one!"}
          </p>
        )}
        {rows.map(({ q, date, again }, i) => {
          const showHeader = groupByDate && (i === 0 || rows[i - 1].date !== date);
          return (
            <div key={`${q.id}-${date}`}>
              {showHeader && (
                <div className="bg-surface-2/60 px-4 py-1.5 text-xs font-medium text-muted">{formatDay(date)}</div>
              )}
              <QuestionRow q={q} again={again} solved={solved.has(q.id)} onToggle={() => toggleSolved(q.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionRow({
  q,
  again,
  solved,
  onToggle,
}: {
  q: QuestionListItem;
  again: boolean;
  solved: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition hover:bg-surface-2/50 sm:px-4">
      <button
        onClick={onToggle}
        aria-label={solved ? "Mark as not solved" : "Mark as solved"}
        title={solved ? "Solved. Click to untick." : "Mark as solved"}
        // the padding gives fingers a bigger target than the visible box
        className="-m-2 shrink-0 p-2"
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition sm:h-5 sm:w-5 ${
            solved ? "border-easy bg-easy text-white" : "border-border hover:border-easy"
          }`}
        >
          {solved && <Check size={14} strokeWidth={3} className="pop-in" />}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <Link href={`/q/${q.id}`} className="font-medium hover:text-accent">
          {q.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="sm:hidden">
            <DifficultyPill d={q.difficulty} />
          </span>
          {again && (
            <span className="chip" title={`First given on ${formatDay(q.source_date)}`}>
              <Repeat size={11} /> given again
            </span>
          )}
          {appearances(q).map((a, i) => (
            <span key={`${a.source_type}-${a.source_date}-${a.source_label}`} className={i > 0 ? "hidden sm:inline-flex" : "inline-flex"}>
              <SourceBadge type={a.source_type} label={a.source_label} date={a.source_date} />
            </span>
          ))}
          <TopicChips topics={q.topics} intents={q.intents} mobileLimit={2} />
        </div>
      </div>

      <div className="hidden w-14 shrink-0 text-right sm:block">
        <DifficultyPill d={q.difficulty} />
      </div>

      {/* only show an icon when there's something behind it */}
      <div className="flex shrink-0 items-center justify-end gap-0.5 sm:w-26 sm:gap-1">
        {q.leetcode_url && (
          <a
            href={q.leetcode_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost p-1.5"
            title="Open on LeetCode"
          >
            <LeetCodeLogo />
          </a>
        )}
        {q.has_statement && (
          <Link href={`/q/${q.id}`} className="btn-ghost p-1.5" title="Problem statement">
            <FileText size={18} />
          </Link>
        )}
        {q.notes_count > 0 && (
          <Link href={`/q/${q.id}?tab=notes`} className="btn-ghost relative p-1.5" title={`${q.notes_count} note(s)`}>
            <NotebookPen size={18} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
              {q.notes_count}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
