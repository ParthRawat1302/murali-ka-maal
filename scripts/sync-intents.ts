// Applies content/intents.json: the topic the teacher intends for each question in each email/class.
// The file is the source of truth: intents not listed there are removed.
// Usage: npx tsx scripts/sync-intents.ts
import { readFileSync } from "node:fs";
import { adminClient } from "./lib/env";

type Group = {
  source_type: string;
  source_label: string | null;
  source_date: string;
  intended: Record<string, string[]>; // leetcode slug or exact title → topics
};

async function main() {
  const { groups } = JSON.parse(readFileSync("content/intents.json", "utf8")) as { groups: Group[] };
  const supabase = adminClient();

  const { data: questions, error: qErr } = await supabase.from("questions").select("id, title, leetcode_slug");
  if (qErr) throw qErr;
  const bySlug = new Map(questions.filter((q) => q.leetcode_slug).map((q) => [q.leetcode_slug as string, q]));
  const byTitle = new Map(questions.map((q) => [q.title.toLowerCase(), q]));

  const rows: { question_id: string; topic_id: string; source_type: string; source_label: string | null; source_date: string }[] = [];
  const missing: string[] = [];
  for (const g of groups) {
    for (const [key, topicNames] of Object.entries(g.intended)) {
      const q = bySlug.get(key) ?? byTitle.get(key.toLowerCase());
      if (!q) {
        missing.push(`${g.source_date} ${key}`);
        continue;
      }
      // the intended topic must also be one of the question's topics
      const { data: current } = await supabase
        .from("question_topics")
        .select("topics(name)")
        .eq("question_id", q.id);
      const names = (current ?? []).map((r) => (r.topics as unknown as { name: string }).name);
      const toAdd = topicNames.filter((t) => !names.some((n) => n.toLowerCase() === t.toLowerCase()));
      for (const name of toAdd) {
        // set_question_topics needs a signed-in member, so insert directly with the secret key
        let { data: t } = await supabase.from("topics").select("id").ilike("name", name).maybeSingle();
        if (!t) {
          const { data, error } = await supabase.from("topics").insert({ name }).select("id").single();
          if (error) throw error;
          t = data;
        }
        const { error: linkErr } = await supabase.from("question_topics").insert({ question_id: q.id, topic_id: t.id });
        if (linkErr) throw linkErr;
        console.log(`  + topic ${name} on ${q.title}`);
      }
      for (const name of topicNames) {
        const { data: t, error } = await supabase.from("topics").select("id").ilike("name", name).single();
        if (error) throw new Error(`topic "${name}": ${error.message}`);
        rows.push({ question_id: q.id, topic_id: t.id, source_type: g.source_type, source_label: g.source_label, source_date: g.source_date });
      }
    }
  }
  if (missing.length) throw new Error(`Not in the database (import them first):\n  ${missing.join("\n  ")}`);

  const { error: delErr } = await supabase.from("question_intents").delete().neq("source_date", "1900-01-01");
  if (delErr) throw delErr;
  const { error: insErr } = await supabase.from("question_intents").insert(rows);
  if (insErr) throw insErr;
  console.log(`✓ ${rows.length} intended topics on ${new Set(rows.map((r) => r.question_id)).size} questions`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
