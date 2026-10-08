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
