@AGENTS.md

# AlgoWeb

Class DSA question tracker (Next.js 16 + Supabase). Setup, accounts and scripts: [README.md](README.md).

## Adding questions from chat

When the user gives you a question to add (LeetCode link, class-notes photo, test question, DomJudge
text or PDF), follow **[prompts/process-question.txt](prompts/process-question.txt)** step by step:
check AlgoWeb for the same question first (if it's already listed, don't re-add it: tag it with the new
source and highlight the topic intended this time via `content/intents.json`), then look for the exact
problem on LeetCode, and only write the question yourself (examples, constraints, SVG diagrams) when
there's no exact LeetCode match. Always record the intended topic and run `scripts/sync-intents.ts`.