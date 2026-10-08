"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/app-context";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/dates";
import type { AuditEntry, Note } from "@/lib/types";

const FIELD: Record<string, string> = {
  title: "title",
  difficulty: "difficulty",
  source_type: "source",
  source_label: "label",
  source_date: "date",
  leetcode_url: "LeetCode link",
  leetcode_slug: "",
  visibility: "visibility",
};

type Change = { from?: unknown; to?: unknown };

function show(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function describe(e: AuditEntry, notes: Note[]): string[] {
  const c = e.changes as Record<string, unknown>;
  const noteTitle = () =>
    (typeof c.title === "string" && c.title) ||
    ((c.title as Change | undefined)?.to as string | undefined) ||
    notes.find((n) => n.id === e.row_id)?.title ||
    "a note";

  if (e.action === "import") return ["imported this question (written up by Claude)"];
  if (e.action === "topic_add") return [`added topic “${c.topic}”`];
  if (e.action === "topic_remove") return [`removed topic “${c.topic}”`];

  if (e.table_name === "questions") {
    if (e.action === "insert") return ["added this question"];
    if (e.action === "delete") return ["deleted this question"];
    return Object.entries(c as Record<string, Change>)
      .filter(([k]) => FIELD[k] !== "")
      .map(([k, v]) =>
        k === "statement" ? "edited the statement" : `changed ${FIELD[k] ?? k} from “${show(v.from)}” to “${show(v.to)}”`,
      );
  }
  if (e.table_name === "notes") {
    if (e.action === "insert") return [`created note “${noteTitle()}”`];
    if (e.action === "delete") return [`deleted note “${noteTitle()}”`];
    return Object.entries(c as Record<string, Change>).map(([k, v]) =>
      k === "content"
        ? `edited note “${notes.find((n) => n.id === e.row_id)?.title ?? "a note"}”`
        : k === "title"
          ? `renamed a note from “${show(v.from)}” to “${show(v.to)}”`
          : `changed note ${FIELD[k] ?? k} from “${show(v.from)}” to “${show(v.to)}”`,
    );
  }
  return [e.action];
}

export function HistoryTab({ questionId, notes }: { questionId: string; notes: Note[] }) {
  const { people } = useApp();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .from("audit_log")
      .select("*")
      .eq("question_id", questionId)
      .order("changed_at", { ascending: false })
      .limit(300)
      .then(({ data }) => setEntries((data ?? []) as AuditEntry[]));
  }, [questionId]);

  if (!entries)
    return (
      <div className="card divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4">
            <div className="skeleton h-3 w-28" />
            <div className={`skeleton h-3 ${i % 2 ? "w-1/2" : "w-2/3"}`} />
          </div>
        ))}
      </div>
    );
  if (!entries.length) return <p className="card p-8 text-center text-sm text-muted">No history yet.</p>;

  return (
    <ol className="card divide-y divide-border">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col gap-0.5 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:gap-4">
          <time className="w-32 shrink-0 text-xs text-muted">{formatDateTime(e.changed_at)}</time>
          <span>
            <b>{e.changed_by ? (people[e.changed_by] ?? "Someone") : "Claude (import)"}</b>{" "}
            {describe(e, notes).join(", ")}
          </span>
        </li>
      ))}
    </ol>
  );
}
