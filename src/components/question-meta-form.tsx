"use client";

import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { DIFFICULTIES, SOURCE_TYPES, type Difficulty, type SourceType } from "@/lib/types";
import type { LeetCodeInfo } from "@/lib/leetcode";
import { MultiSelect } from "./multi-select";

export type QuestionMeta = {
  title: string;
  difficulty: Difficulty;
  source_type: SourceType;
  source_label: string;
  source_date: string;
  leetcode_url: string;
  topics: string[];
};

const DIFF_ON: Record<Difficulty, string> = {
  easy: "border-easy text-easy",
  medium: "border-medium text-medium",
  hard: "border-hard text-hard",
};

const LABEL_HINT: Record<SourceType, string> = {
  email: "Email subject (optional)",
  test: "Test name, e.g. Midterm 1",
  class_notes: "Lecture / topic (optional)",
  domjudge: "Contest or set name (optional)",
  other: "Where it came from (optional)",
};

export function QuestionMetaForm({
  value,
  onChange,
  allTopics,
  onLeetCode,
}: {
  value: QuestionMeta;
  onChange: (v: QuestionMeta) => void;
  allTopics: string[];
  /** Called after a successful LeetCode lookup, e.g. to load the statement. */
  onLeetCode?: (info: LeetCodeInfo) => void;
}) {
  const [fetching, setFetching] = useState(false);
  const [lcError, setLcError] = useState<string | null>(null);
  const set = (patch: Partial<QuestionMeta>) => onChange({ ...value, ...patch });

  async function fetchLeetCode() {
    if (!value.leetcode_url.trim()) return;
    setFetching(true);
    setLcError(null);
    try {
      const res = await fetch(`/api/leetcode?url=${encodeURIComponent(value.leetcode_url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      const info = data as LeetCodeInfo;
      const known = new Map(allTopics.map((t) => [t.toLowerCase(), t]));
      onChange({
        ...value,
        title: info.title,
        difficulty: info.difficulty,
        leetcode_url: info.url,
        source_type: value.source_type === "other" ? "email" : value.source_type,
        topics: [...new Set([...value.topics, ...info.topics.map((t) => known.get(t.toLowerCase()) ?? t)])],
      });
      onLeetCode?.(info);
    } catch (e) {
      setLcError((e as Error).message);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">LeetCode link</span>
        <div className="flex gap-2">
          <input
            value={value.leetcode_url}
            onChange={(e) => set({ leetcode_url: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                fetchLeetCode();
              }
            }}
            placeholder="https://leetcode.com/problems/two-sum/ (optional)"
            className="input min-w-0 flex-1"
          />
          <button
            type="button"
            className="btn"
            onClick={fetchLeetCode}
            disabled={fetching || !value.leetcode_url.trim()}
            title="Fill title, difficulty, topics and statement from LeetCode"
          >
            {fetching ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Auto-fill
          </button>
        </div>
        {lcError && <p className="mt-1 text-xs text-hard">{lcError}</p>}
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">Title *</span>
        <input
          value={value.title}
          onChange={(e) => set({ title: e.target.value })}
          required
          placeholder="e.g. Two Sum"
          className="input w-full"
        />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium">Difficulty</span>
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => set({ difficulty: d })}
              className={`flex-1 rounded-lg border px-2 py-2 text-sm capitalize transition ${
                value.difficulty === d
                  ? `bg-surface-2 font-semibold ${DIFF_ON[d]}`
                  : "border-border text-muted hover:bg-surface-2"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Topics</span>
        <MultiSelect
          options={allTopics}
          value={value.topics}
          onChange={(topics) => set({ topics })}
          placeholder="Pick or add topics"
          allowCreate
        />
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Source</span>
        <select
          value={value.source_type}
          onChange={(e) => set({ source_type: e.target.value as SourceType })}
          className="input w-full"
        >
          {SOURCE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Date</span>
        <input
          type="date"
          value={value.source_date}
          onChange={(e) => set({ source_date: e.target.value })}
          required
          className="input w-full"
        />
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium">
          {value.source_type === "test" ? "Test name" : "Label"}
        </span>
        <input
          value={value.source_label}
          onChange={(e) => set({ source_label: e.target.value })}
          placeholder={LABEL_HINT[value.source_type]}
          className="input w-full"
        />
      </label>
    </div>
  );
}
