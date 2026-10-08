"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Check, ChevronDown, Crosshair, FileText, History, Loader2, NotebookPen, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { DocEditor } from "@/components/editor/doc-editor";
import { QuestionMetaForm, type QuestionMeta } from "@/components/question-meta-form";
import { DifficultyPill, LeetCodeLogo, SourceBadge } from "@/components/ui";
import { intentSource, TopicChips } from "@/components/topic-chips";
import { supabaseBrowser } from "@/lib/supabase/client";
import { metaToRow, setTopics } from "@/lib/questions";
import { timeAgo } from "@/lib/dates";
import { appearances, type Intent, type Note, type Question } from "@/lib/types";
import { NotesTab, type NoteState } from "./notes-tab";
import { HistoryTab } from "./history-tab";

type Tab = "statement" | "notes" | "history";

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function QuestionView({
  initialQuestion,
  initialTopics,
  initialNotes,
  initialSolved,
  intents,
  allTopics,
  initialTab,
}: {
  initialQuestion: Question;
  initialTopics: string[];
  initialNotes: Note[];
  initialSolved: boolean;
  intents: Intent[];
  allTopics: string[];
  initialTab: Tab;
}) {
  const { profile, people } = useApp();
  const router = useRouter();
  const [q, setQ] = useState(initialQuestion);
  const [topics, setTopicsState] = useState(initialTopics);
  const [showDetails, setShowDetails] = useState(false);
  // Statement content as last received from someone else; our own saves don't round-trip.
  const [statement, setStatement] = useState({ doc: initialQuestion.statement, version: initialQuestion.updated_at });
  const serverStatement = useRef(initialQuestion.statement);
  const [notes, setNotes] = useState<NoteState[]>(() =>
    initialNotes.map((n) => ({ ...n, docVersion: n.updated_at })),
  );
  const [solved, setSolved] = useState(initialSolved);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [editingMeta, setEditingMeta] = useState(false);
  const [editingStatement, setEditingStatement] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "statement") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url);
  }

  // Live updates from other people.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`question-${q.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "questions", filter: `id=eq.${q.id}` },
        (payload) => {
          const row = payload.new as Question;
          setQ(row);
          if (row.updated_by !== profile.id && !sameJson(row.statement, serverStatement.current)) {
            serverStatement.current = row.statement;
            setStatement({ doc: row.statement, version: row.updated_at });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes", filter: `question_id=eq.${q.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as Note;
          setNotes((list) => {
            const existing = list.find((n) => n.id === row.id);
            if (!existing) return [...list, { ...row, docVersion: row.updated_at }];
            return list.map((n) => {
              if (n.id !== row.id) return n;
              const contentChanged = row.updated_by !== profile.id && !sameJson(row.content, n.content);
              return contentChanged
                ? { ...row, docVersion: row.updated_at }
                : { ...n, title: row.title, visibility: row.visibility, updated_at: row.updated_at, updated_by: row.updated_by };
            });
          });
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notes" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setNotes((list) => list.filter((n) => n.id !== id));
      });
    let cancelled = false;
    // Join with the user's token, not the anon key, or RLS hides every row from the subscription.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      supabase.realtime.setAuth(data.session?.access_token ?? null);
      channel.subscribe();
    });
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [q.id, profile.id]);

  async function toggleSolved() {
    const next = !solved;
    setSolved(next);
    const { error } = await supabaseBrowser()
      .from("progress")
      .upsert({ user_id: profile.id, question_id: q.id, solved: next });
    if (error) {
      setSolved(!next);
      alert(error.message);
    }
  }

  async function saveStatement(doc: JSONContent | null) {
    const { data, error } = await supabaseBrowser()
      .from("questions")
      .update({ statement: doc })
      .eq("id", q.id)
      .select("updated_at")
      .single();
    if (error) throw error;
    serverStatement.current = doc;
    setQ((cur) => ({ ...cur, statement: doc, updated_at: data.updated_at, updated_by: profile.id }));
    return data.updated_at as string;
  }

  async function deleteQuestion() {
    if (!confirm(`Delete “${q.title}” for everyone? Its notes and everyone's progress on it will be removed.`)) return;
    const { error } = await supabaseBrowser().from("questions").delete().eq("id", q.id);
    if (error) return alert(error.message);
    router.push("/");
    router.refresh();
  }

  const visibleNotes = notes.length;
  const lastEditor = q.updated_by ? people[q.updated_by] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/" className="btn-ghost -ml-2">
        <ArrowLeft size={16} /> All questions
      </Link>

      {editingMeta ? (
        <MetaEditor
          question={q}
          topics={topics}
          allTopics={allTopics}
          onCancel={() => setEditingMeta(false)}
          onSaved={(row, t) => {
            setQ((cur) => ({ ...cur, ...row }));
            setTopicsState(t);
            setEditingMeta(false);
            router.refresh();
          }}
        />
      ) : (
        <header className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
            <button
              onClick={toggleSolved}
              aria-label={solved ? "Mark as not solved" : "Mark as solved"}
              title={solved ? "Solved. Click to untick." : "Mark as solved"}
              className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                solved ? "border-easy bg-easy text-white" : "border-border hover:border-easy"
              }`}
            >
              {solved && <Check size={16} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold sm:text-2xl">{q.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DifficultyPill d={q.difficulty} />
                {appearances({ ...q, intents }).map((a) => (
                  <SourceBadge key={`${a.source_type}-${a.source_date}-${a.source_label}`} type={a.source_type} label={a.source_label} date={a.source_date} />
                ))}
                <TopicChips topics={topics} intents={intents} link />
              </div>
              <button
                className="mt-2 flex items-center gap-1 text-xs text-muted hover:text-fg"
                onClick={() => setShowDetails((d) => !d)}
                aria-expanded={showDetails}
              >
                <ChevronDown size={14} className={`transition ${showDetails ? "rotate-180" : ""}`} />
                {showDetails ? "Hide details" : "See details"}
              </button>
              {showDetails && (
                <div className="mt-1.5 space-y-1 text-xs text-muted">
                  {intents.length > 0 && (
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <Crosshair size={13} className="text-accent" />
                      <span>Intended method:</span>
                      {intents.map((i, n) => (
                        <span key={`${i.topic}-${i.source_date}`}>
                          <b className="font-medium text-fg">{i.topic}</b> ({intentSource(i)})
                          {n < intents.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </p>
                  )}
                  <p>
                    Added {q.created_by && people[q.created_by] ? `by ${people[q.created_by]} ` : ""}
                    {timeAgo(q.created_at)}
                    {lastEditor ? ` · last edited by ${lastEditor} ${timeAgo(q.updated_at)}` : ""}
                  </p>
                </div>
              )}
            </div>
            <div className="flex w-full shrink-0 items-center justify-end gap-1 border-t border-border pt-2 sm:w-auto sm:border-0 sm:pt-0">
              {q.leetcode_url && (
                <a href={q.leetcode_url} target="_blank" rel="noopener noreferrer" className="btn" title="Open on LeetCode">
                  <LeetCodeLogo /> <span className="hidden sm:inline">LeetCode</span>
                </a>
              )}
              <button className="btn-ghost" onClick={() => setEditingMeta(true)} title="Edit details">
                <Pencil size={16} />
              </button>
              <button className="btn-ghost hover:text-hard" onClick={deleteQuestion} title="Delete question">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </header>
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {(
          [
            ["statement", "Statement", FileText],
            ["notes", `Notes${visibleNotes ? ` (${visibleNotes})` : ""}`, NotebookPen],
            ["history", "History", History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>

      {tab === "statement" && (
        <section>
          {statement.doc || q.statement || editingStatement ? (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button className="btn py-1.5" onClick={() => setEditingStatement((e) => !e)}>
                  {editingStatement ? (
                    <>
                      <Check size={14} /> Done editing
                    </>
                  ) : (
                    <>
                      <Pencil size={14} /> Edit statement
                    </>
                  )}
                </button>
              </div>
              <div className={editingStatement ? "" : "card"}>
                <DocEditor
                  value={statement.doc}
                  version={statement.version}
                  editable={editingStatement}
                  onSave={saveStatement}
                  placeholder="Problem statement, examples, constraints…"
                  minHeight="10rem"
                />
              </div>
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 p-10 text-center">
              <FileText size={28} className="text-muted" />
              <p className="text-sm text-muted">
                No written statement yet
                {q.leetcode_url ? ". Open it on LeetCode, or write one here." : "."}
              </p>
              <button className="btn-primary" onClick={() => setEditingStatement(true)}>
                <Pencil size={14} /> Write statement
              </button>
            </div>
          )}
        </section>
      )}

      {tab === "notes" && <NotesTab questionId={q.id} notes={notes} setNotes={setNotes} />}
      {tab === "history" && <HistoryTab questionId={q.id} notes={notes} />}
    </div>
  );
}

function MetaEditor({
  question,
  topics,
  allTopics,
  onCancel,
  onSaved,
}: {
  question: Question;
  topics: string[];
  allTopics: string[];
  onCancel: () => void;
  onSaved: (row: Partial<Question>, topics: string[]) => void;
}) {
  const [meta, setMeta] = useState<QuestionMeta>({
    title: question.title,
    difficulty: question.difficulty,
    source_type: question.source_type,
    source_label: question.source_label ?? "",
    source_date: question.source_date,
    leetcode_url: question.leetcode_url ?? "",
    topics,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!meta.title.trim()) return setError("Title can't be empty.");
    setSaving(true);
    setError(null);
    const supabase = supabaseBrowser();
    try {
      const row = metaToRow(meta);
      const { data, error: upErr } = await supabase
        .from("questions")
        .update(row)
        .eq("id", question.id)
        .select("updated_at, updated_by")
        .single();
      if (upErr) throw upErr;
      await setTopics(supabase, question.id, meta.topics);
      onSaved({ ...row, ...data }, [...meta.topics].sort());
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">Edit details</h2>
      <QuestionMetaForm value={meta} onChange={setMeta} allTopics={allTopics} />
      {error && <p className="text-sm text-hard">{error}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />} Save
        </button>
      </div>
    </section>
  );
}
