// Checks whether a question is already in AlgoWeb before importing it.
// Usage: npx tsx scripts/find-question.ts <words from the title | leetcode url or slug>
import { slugFromUrl } from "../src/lib/leetcode";
import { adminClient } from "./lib/env";

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) throw new Error("Usage: npx tsx scripts/find-question.ts <title words | leetcode url>");
  const supabase = adminClient();
  const slug = query.includes("leetcode") ? slugFromUrl(query) : null;

  let req = supabase
    .from("question_list")
    .select("id, title, difficulty, source_type, source_label, source_date, leetcode_url, topics")
    .order("source_date", { ascending: false })
    .limit(20);
  if (slug) {
    req = req.or(`leetcode_url.ilike.%/problems/${slug}%,title.ilike.%${slug.replace(/-/g, " ")}%`);
  } else {
    // every word must appear in the title
    for (const w of query.split(/\s+/)) req = req.ilike("title", `%${w.replace(/[%_,()]/g, "")}%`);
  }
  const { data, error } = await req;
  if (error) throw error;
  if (!data?.length) return console.log("no match: safe to add");
  for (const q of data)
    console.log(
      `${q.title} · ${q.difficulty} · ${q.source_type}${q.source_label ? ` (${q.source_label})` : ""} · ${q.source_date}` +
        `${q.leetcode_url ? ` · ${q.leetcode_url}` : ""} · [${q.topics.join(", ")}] → /q/${q.id}`,
    );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
