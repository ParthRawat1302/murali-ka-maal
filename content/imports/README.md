# Question imports

One JSON file per question, imported with `npx tsx scripts/import-question.ts <file>.json [--as <username>]`.
Paths inside the file are relative to it. Name files `YYYY-MM-DD-short-slug.json`, and put diagrams in `assets/`.

```json
{
  "title": "Vertical Order Traversal",
  "difficulty": "medium",
  "topics": ["Tree", "Breadth-First Search"],
  "source_type": "class_notes",
  "source_label": "Lecture 12",
  "source_date": "2026-10-08",
  "leetcode_url": null,
  "statement_html": "<p>Given the <code>root</code> …</p><img src=\"asset:tree-1.svg\" alt=\"Example tree\"><pre><code class=\"language-plaintext\">Input: root = [3,9,20,null,null,15,7]\nOutput: [[9],[3,15],[20],[7]]</code></pre>",
  "assets": { "tree-1.svg": "assets/2026-10-08-tree-1.svg" },
  "statement_append": "<h3>Original PDF</h3><p><a data-file-attachment href=\"asset:prob-X.pdf\" data-name=\"prob-X.pdf\">prob-X.pdf</a></p>"
}
```

For a LeetCode problem, only the link and source are needed. Title, difficulty, topics and the official
statement are fetched automatically, and any `topics` you list are added on top:

```json
{ "leetcode_url": "https://leetcode.com/problems/two-sum/", "source_type": "email", "source_date": "2026-10-08" }
```

- `difficulty`: `easy` | `medium` | `hard`
- `source_type`: `email` | `test` | `class_notes` | `domjudge` | `other`. Use `source_label` for the test name or email subject.
- `statement_file` can point to an `.html` file instead of inline HTML.
- `statement_append` is shown below the statement after a divider, also below one fetched from LeetCode
  (original PDF, DomJudge input/output format, required approach). Don't add `notes`: notes are the students'.
- `asset:<name>` anywhere in the HTML becomes the uploaded file's public URL.

## Writing statements (LeetCode style)

1. A short problem description. Use `<code>` for identifiers and `<sup>` for powers (`10<sup>5</sup>`).
2. `<p><strong>Example 1:</strong></p>`, then an optional diagram `<img>`, then a
   `<pre><code class="language-plaintext">Input: …\nOutput: …\nExplanation: …</code></pre>` block.
3. `<p><strong>Constraints:</strong></p><ul><li><p>…</p></li></ul>`
4. Draw diagrams (trees, arrays with indices, linked lists, grids, graphs) as SVG on a white background, about 300–600px wide, with readable 14–16px labels.

Supported HTML: headings, paragraphs, bold/italic/underline/strike, inline code, sup/sub, links, lists,
blockquote, code blocks (`language-xxx`), tables, images, and `<a data-file-attachment href=… data-name=…>` file chips.
