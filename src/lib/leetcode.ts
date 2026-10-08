/** "https://leetcode.com/problems/two-sum/description/" → "two-sum" */
export function slugFromUrl(input: string) {
  const m = /leetcode\.(?:com|cn)\/problems\/([a-z0-9-]+)/i.exec(input);
  if (m) return m[1].toLowerCase();
  return /^[a-z0-9-]+$/i.test(input.trim()) ? input.trim().toLowerCase() : null;
}

export type LeetCodeInfo = {
  slug: string;
  url: string;
  title: string;
  number: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  statementHtml: string | null;
  paidOnly: boolean;
};

const QUERY = `query q($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionFrontendId title titleSlug difficulty content isPaidOnly
    topicTags { name }
  }
}`;

function cleanHtml(html: string) {
  return (
    html
      .replace(/<p>(?:&nbsp;|\s)*<\/p>/g, "")
      .replace(/&nbsp;/g, " ")
      // Example blocks are plain text: no syntax colouring, no trailing blank line.
      .replace(/<pre>\s*/g, '<pre><code class="language-plaintext">')
      .replace(/\s*<\/pre>/g, "</code></pre>")
      .trim()
  );
}

/** Looks up a problem on LeetCode's public GraphQL API. Returns null if it doesn't exist. */
export async function fetchLeetCode(slug: string): Promise<LeetCodeInfo | null> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/problems/${slug}/`,
      "User-Agent": "Mozilla/5.0 (compatible; AlgoWeb/1.0)",
    },
    body: JSON.stringify({ query: QUERY, variables: { titleSlug: slug } }),
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);
  const q = (await res.json())?.data?.question;
  if (!q) return null;
  return {
    slug: q.titleSlug,
    url: `https://leetcode.com/problems/${q.titleSlug}/`,
    title: q.title,
    number: q.questionFrontendId,
    difficulty: String(q.difficulty).toLowerCase() as LeetCodeInfo["difficulty"],
    topics: (q.topicTags ?? []).map((t: { name: string }) => t.name),
    statementHtml: q.content ? cleanHtml(q.content) : null,
    paidOnly: !!q.isPaidOnly,
  };
}
