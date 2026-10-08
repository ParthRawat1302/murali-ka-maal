import type { JSONContent } from "@tiptap/react";

export type Difficulty = "easy" | "medium" | "hard";
export type SourceType = "email" | "test" | "class_notes" | "domjudge" | "other";
export type Visibility = "public" | "private";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  is_admin: boolean;
};

export type QuestionListItem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  source_type: SourceType;
  source_label: string | null;
  source_date: string;
  leetcode_url: string | null;
  created_at: string;
  updated_at: string;
  has_statement: boolean;
  topics: string[];
  notes_count: number;
  intents: Intent[];
};

/** Every email / class / test / DomJudge set a question was given in (first one first). */
export function appearances(q: Pick<QuestionListItem, "source_type" | "source_label" | "source_date" | "intents">) {
  const all = [{ source_type: q.source_type, source_label: q.source_label, source_date: q.source_date }];
  for (const i of q.intents) {
    // same type + date is the same set even if only one side has a label
    const same = (a: (typeof all)[number]) =>
      a.source_type === i.source_type &&
      a.source_date === i.source_date &&
      (a.source_label === i.source_label || !a.source_label || !i.source_label);
    if (!all.some(same))
      all.push({ source_type: i.source_type, source_label: i.source_label, source_date: i.source_date });
  }
  return all;
}

/** The topic the teacher intends for a question in one email / class / test. */
export type Intent = {
  topic: string;
  source_type: SourceType;
  source_label: string | null;
  source_date: string;
};

export type Question = {
  id: string;
  title: string;
  difficulty: Difficulty;
  source_type: SourceType;
  source_label: string | null;
  source_date: string;
  leetcode_url: string | null;
  leetcode_slug: string | null;
  statement: JSONContent | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  question_id: string;
  owner_id: string;
  visibility: Visibility;
  title: string;
  content: JSONContent | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditEntry = {
  id: number;
  table_name: string;
  row_id: string;
  question_id: string | null;
  action: string;
  changed_by: string | null;
  changed_at: string;
  changes: Record<string, unknown>;
};

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "test", label: "Test" },
  { value: "class_notes", label: "Class notes" },
  { value: "domjudge", label: "DomJudge" },
  { value: "other", label: "Other" },
];

export function sourceTypeLabel(t: SourceType) {
  return SOURCE_TYPES.find((s) => s.value === t)?.label ?? t;
}
