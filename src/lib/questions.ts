import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionMeta } from "@/components/question-meta-form";
import { slugFromUrl } from "./leetcode";

/** Columns of `questions` derived from the details form. */
export function metaToRow(m: QuestionMeta) {
  const url = m.leetcode_url.trim();
  return {
    title: m.title.trim(),
    difficulty: m.difficulty,
    source_type: m.source_type,
    source_label: m.source_label.trim() || null,
    source_date: m.source_date,
    leetcode_url: url || null,
    leetcode_slug: url ? slugFromUrl(url) : null,
  };
}

export async function setTopics(supabase: SupabaseClient, questionId: string, topics: string[]) {
  const { error } = await supabase.rpc("set_question_topics", { p_question: questionId, p_names: topics });
  if (error) throw error;
}
