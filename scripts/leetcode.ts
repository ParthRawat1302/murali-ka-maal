// Prints a LeetCode problem so its statement can be compared with a class/test question.
// Usage: npx tsx scripts/leetcode.ts <slug or url> [more slugs…]
import { fetchLeetCode, slugFromUrl } from "../src/lib/leetcode";

function toText(html: string) {
  return html
    .replace(/<sup>(.*?)<\/sup>/g, "^$1")
    .replace(/<(?:p|li|pre|br)[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) throw new Error("Usage: npx tsx scripts/leetcode.ts <slug or url> [...]");
  for (const input of inputs) {
    const slug = slugFromUrl(input);
    const info = slug ? await fetchLeetCode(slug) : null;
    if (!info) {
      console.log(`✗ ${input}: not found on LeetCode\n`);
      continue;
    }
    console.log(`#${info.number} ${info.title} · ${info.difficulty}${info.paidOnly ? " · premium" : ""}`);
    console.log(info.url);
    console.log(`topics: ${info.topics.join(", ")}`);
    console.log(`\n${info.statementHtml ? toText(info.statementHtml) : "(statement hidden, premium)"}\n${"─".repeat(60)}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
