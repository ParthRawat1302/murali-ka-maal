// Imports a question written up by Claude (from a class-notes photo, DomJudge text, …).
// Usage: npx tsx scripts/import-question.ts content/imports/<file>.json [--as <username>] [--allow-duplicate]
// Workflow for Claude: prompts/process-question.txt
//
// File format (paths are relative to the JSON file):
// {
//   "title": "Vertical Order Traversal",
//   "difficulty": "medium",                 // easy | medium | hard
//   "topics": ["Tree", "BFS"],
//   "source_type": "class_notes",           // email | test | class_notes | domjudge | other
//   "source_label": "Lecture 12",           // optional
//   "source_date": "2026-10-08",
//   "leetcode_url": null,                   // optional
//   "statement_html": "<p>…<img src=\"asset:tree.svg\"></p>",   // or "statement_file": "x.html"
//   "statement_append": "<h3>DomJudge version</h3>…",           // added below the statement (also below
//                                                              // one fetched from LeetCode): original PDF,
//                                                              // DomJudge format, required approach…
//   "assets": { "tree.svg": "assets/tree.svg" },               // uploaded; "asset:<name>" → public URL
//   "notes": [ … ]                                             // only if the user asks: notes are theirs
// }
// With a leetcode_url, any missing title / difficulty / statement is fetched from LeetCode and its
// topic tags are merged into "topics".
import { readFileSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { generateJSON } from "@tiptap/html/server";
import { baseExtensions } from "../src/lib/editor/extensions";
import { fetchLeetCode, slugFromUrl, type LeetCodeInfo } from "../src/lib/leetcode";
import { adminClient } from "./lib/env";

type ImportNote = { title: string; html?: string; file?: string; visibility?: "public" | "private" };
type ImportFile = {
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
  topics?: string[];
  source_type: "email" | "test" | "class_notes" | "domjudge" | "other";
  source_label?: string | null;
  source_date: string;
  leetcode_url?: string | null;
  statement_html?: string;
  statement_file?: string;
  statement_append?: string;
  assets?: Record<string, string>;
  notes?: ImportNote[];
};

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

async function main() {
  const args = process.argv.slice(2);
  const asIdx = args.indexOf("--as");
  const username = asIdx >= 0 ? args[asIdx + 1] : undefined;
  const file = args.find((a, i) => !a.startsWith("--") && (asIdx < 0 || i !== asIdx + 1));
  if (!file) throw new Error("Usage: npx tsx scripts/import-question.ts <file.json> [--as <username>] [--allow-duplicate]");
  const allowDuplicate = args.includes("--allow-duplicate");

  const base = dirname(resolve(file));
  const spec: ImportFile = JSON.parse(readFileSync(file, "utf8"));
  const supabase = adminClient();

  // Fill gaps from LeetCode.
  const leetcodeUrl = spec.leetcode_url?.trim() || null;
  const slug = leetcodeUrl ? slugFromUrl(leetcodeUrl) : null;
  if (leetcodeUrl && !slug) throw new Error(`Not a LeetCode problem link: ${leetcodeUrl}`);
  let lc: LeetCodeInfo | null | undefined;
  if (slug) {
    lc = await fetchLeetCode(slug).catch((e) => {
      console.warn(`  LeetCode lookup failed (${e.message}); using the file as-is`);
      return undefined;
    });
    if (lc) {
      spec.title ||= lc.title;
      spec.difficulty ||= lc.difficulty;
      spec.topics = [...(spec.topics ?? []), ...lc.topics];
      if (!spec.statement_html && !spec.statement_file && lc.statementHtml) spec.statement_html = lc.statementHtml;
      console.log(`  LeetCode #${lc.number} ${lc.title} (${lc.difficulty})${lc.paidOnly ? " [premium]" : ""}`);
    } else if (lc === null) {
      console.warn(`  "${slug}" not found on LeetCode`);
    }
  }
  if (!spec.title || !spec.difficulty) throw new Error("title and difficulty are required (or a valid leetcode_url)");
  const title = spec.title;

  // Who the import is attributed to (defaults to the first admin).
  const profileQuery = supabase.from("profiles").select("id, display_name");
  const { data: user, error: userErr } = await (username
    ? profileQuery.eq("username", username.toLowerCase())
    : profileQuery.eq("is_admin", true).order("created_at")
  )
    .limit(1)
    .maybeSingle();
  if (userErr || !user) throw new Error(`No profile found for ${username ?? "admin"}`);

  // Upload assets and build the replacement map.
  const urls: Record<string, string> = {};
  const folder = `${user.id}/imports/${spec.source_date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}`;
  for (const [name, rel] of Object.entries(spec.assets ?? {})) {
    const path = `${folder}/${name}`;
    const body = readFileSync(resolve(base, rel));
    const { error } = await supabase.storage
      .from("media")
      .upload(path, body, { contentType: MIME[extname(name).toLowerCase()] ?? "application/octet-stream", upsert: true });
    if (error) throw error;
    urls[name] = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
    console.log(`  uploaded ${name}`);
  }
  const withAssets = (html: string) =>
    html.replace(/asset:([\w.\-]+)/g, (m, name) => {
      if (!urls[name]) throw new Error(`Unknown asset ${name}`);
      return urls[name];
    });
  const toDoc = (html: string) => generateJSON(withAssets(html), baseExtensions());

  const statementHtml =
    (spec.statement_file ? readFileSync(resolve(base, spec.statement_file), "utf8") : (spec.statement_html ?? "")) +
      (spec.statement_append ? `<hr>${spec.statement_append}` : "") || undefined;
  const row = {
    title: title.trim(),
    difficulty: spec.difficulty,
    source_type: spec.source_type,
    source_label: spec.source_label?.trim() || null,
    source_date: spec.source_date,
    leetcode_url: lc?.url ?? leetcodeUrl,
    leetcode_slug: slug,
    statement: statementHtml ? toDoc(statementHtml) : null,
    updated_by: user.id,
  };

  // Re-running the same file updates the same question.
  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("title", row.title)
    .eq("source_type", row.source_type)
    .eq("source_date", row.source_date)
    .maybeSingle();

  // The same LeetCode problem already in the list (e.g. given again in a test) is usually a mistake.
  if (slug && !allowDuplicate) {
    const { data: dupes } = await supabase
      .from("questions")
      .select("id, title, source_type, source_label, source_date")
      .eq("leetcode_slug", slug)
      .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000");
    if (dupes?.length) {
      for (const d of dupes)
        console.error(`  already listed: ${d.title} (${d.source_type} ${d.source_label ?? ""} ${d.source_date}) → /q/${d.id}`);
      throw new Error("Duplicate LeetCode problem. Re-run with --allow-duplicate to add it anyway.");
    }
  }

  let id: string;
  if (existing) {
    const { error } = await supabase.from("questions").update(row).eq("id", existing.id);
    if (error) throw error;
    id = existing.id;
    console.log(`updated question ${id}`);
  } else {
    const { data, error } = await supabase
      .from("questions")
      .insert({ ...row, created_by: user.id })
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
    console.log(`created question ${id}`);
  }

  // Topics (set_question_topics needs a signed-in member, so sync directly).
  const topics = [...new Set((spec.topics ?? []).map((t) => t.trim()).filter(Boolean))];
  const { data: allTopics } = await supabase.from("topics").select("id, name");
  const byLower = new Map((allTopics ?? []).map((t) => [t.name.toLowerCase(), t.id as string]));
  const ids: string[] = [];
  for (const t of topics) {
    let tid = byLower.get(t.toLowerCase());
    if (!tid) {
      const { data, error } = await supabase.from("topics").insert({ name: t }).select("id").single();
      if (error) throw error;
      tid = data.id as string;
    }
    if (!ids.includes(tid)) ids.push(tid);
  }
  const { data: current } = await supabase.from("question_topics").select("topic_id").eq("question_id", id);
  const have = new Set((current ?? []).map((r) => r.topic_id));
  const stale = [...have].filter((t) => !ids.includes(t));
  if (stale.length) await supabase.from("question_topics").delete().eq("question_id", id).in("topic_id", stale);
  const fresh = ids.filter((t) => !have.has(t)).map((topic_id) => ({ question_id: id, topic_id }));
  if (fresh.length) {
    const { error } = await supabase.from("question_topics").insert(fresh);
    if (error) throw error;
  }

  // Notes: matched by title so re-imports update instead of duplicating.
  for (const n of spec.notes ?? []) {
    const html = n.file ? readFileSync(resolve(base, n.file), "utf8") : (n.html ?? "");
    const note = {
      question_id: id,
      owner_id: user.id,
      visibility: n.visibility ?? "public",
      title: n.title,
      content: toDoc(html),
      updated_by: user.id,
    };
    const { data: prev } = await supabase
      .from("notes")
      .select("id")
      .eq("question_id", id)
      .eq("owner_id", user.id)
      .eq("title", n.title)
      .maybeSingle();
    const { error } = prev
      ? await supabase.from("notes").update(note).eq("id", prev.id)
      : await supabase.from("notes").insert(note);
    if (error) throw error;
    console.log(`  ${prev ? "updated" : "added"} note “${n.title}”`);
  }

  await supabase.from("audit_log").insert({
    table_name: "questions",
    row_id: id,
    question_id: id,
    action: "import",
    changed_by: user.id,
    changes: { via: "claude", file: relative(process.cwd(), resolve(file)).replace(/\\/g, "/") },
  });

  console.log(`done → /q/${id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
