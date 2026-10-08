"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { startNavProgress } from "@/components/nav-progress";
import { DocEditor } from "@/components/editor/doc-editor";
import { QuestionMetaForm, type QuestionMeta } from "@/components/question-meta-form";
import { supabaseBrowser } from "@/lib/supabase/client";
import { todayIST } from "@/lib/dates";
import { metaToRow, setTopics } from "@/lib/questions";
import { slugFromUrl } from "@/lib/leetcode";

export function AddQuestion({ allTopics }: { allTopics: string[] }) {
  const router = useRouter();
  const [meta, setMeta] = useState<QuestionMeta>({
    title: "",
    difficulty: "medium",
    source_type: "email",
    source_label: "",
    source_date: todayIST(),
    leetcode_url: "",
    topics: [],
  });
  const [statement, setStatement] = useState<JSONContent | null>(null);
  const [statementSeed, setStatementSeed] = useState<{ key: number; html: string | null }>({ key: 0, html: null });
  const [note, setNote] = useState<JSONContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  async function checkDuplicate(url: string) {
    const slug = slugFromUrl(url);
    if (!slug) return setDuplicate(null);
    const { data } = await supabaseBrowser()
      .from("questions")
      .select("id, title")
      .eq("leetcode_slug", slug)
      .limit(1)
      .maybeSingle();
    setDuplicate(data);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!meta.title.trim()) return setError("Give the question a title.");
    setSaving(true);
    setError(null);
    const supabase = supabaseBrowser();
    try {
      const { data, error: insErr } = await supabase
        .from("questions")
        .insert({ ...metaToRow(meta), statement })
        .select("id")
        .single();
      if (insErr) throw insErr;
      if (meta.topics.length) await setTopics(supabase, data.id, meta.topics);
      if (note) {
        const { error: nErr } = await supabase
          .from("notes")
          .insert({ question_id: data.id, title: "Notes", visibility: "public", content: note });
        if (nErr) throw nErr;
      }
      startNavProgress();
      router.push(`/q/${data.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add a question</h1>
        <p className="mt-1 text-sm text-muted">
          Paste a LeetCode link and press <b>Auto-fill</b>, or type the details and paste the DomJudge text
          into the statement. Everything stays editable later.
        </p>
      </div>

      <section className="card p-5">
        <QuestionMetaForm
          value={meta}
          onChange={(m) => {
            if (m.leetcode_url !== meta.leetcode_url) checkDuplicate(m.leetcode_url);
            setMeta(m);
          }}
          allTopics={allTopics}
          onLeetCode={(info) => {
            checkDuplicate(info.url);
            if (info.statementHtml) setStatementSeed((s) => ({ key: s.key + 1, html: info.statementHtml }));
          }}
        />
        {duplicate && (
          <p className="mt-3 rounded-lg bg-medium/10 px-3 py-2 text-sm">
            This LeetCode problem is already in the list:{" "}
            <Link href={`/q/${duplicate.id}`} className="font-medium text-link underline">
              {duplicate.title}
            </Link>
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Problem statement</h2>
        <p className="text-sm text-muted">
          Optional for LeetCode links. Use code blocks for examples and paste images of diagrams.
        </p>
        <DocEditor
          key={statementSeed.key}
          value={statementSeed.html}
          onChange={setStatement}
          placeholder="Problem statement, examples, constraints…"
          minHeight="12rem"
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Notes / teacher&apos;s solution</h2>
        <p className="text-sm text-muted">Optional. Saved as a public note everyone can see and edit.</p>
        <DocEditor value={null} onChange={setNote} placeholder="Approach, solution code, photos of the board…" />
      </section>

      {error && <p className="text-sm text-hard">{error}</p>}
      <div className="flex justify-end gap-2">
        <Link href="/" className="btn">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save question
        </button>
      </div>
    </form>
  );
}
