# Murali ka maal (AlgoWeb)

A private class tracker for DSA practice questions: LeetCode links from email, DomJudge problems, and
questions from class notes. Each person tracks their own progress; statements and notes are shared rich
docs with images and files.

Stack: Next.js 16 (App Router) · Supabase (Postgres + RLS, Auth, Storage, Realtime) · TipTap editor · Tailwind 4.

Live: https://murali-ka-maal.vercel.app (class members only)

## Requirements

- **Node.js 20 or newer** (developed on Node 22) and npm
- **A Supabase project** (the free tier is enough) for the database, logins and file uploads
- Optional: a **Vercel** account to host it

No secrets are in this repo. Copy [.env.example](.env.example) to `.env.local` and fill it in:

| var | what |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` | Supabase secret key. Server only: login lookup, admin analytics, scripts |
| `CLASS_PASSCODE` | the shared password everyone types at login |
| `AUTH_PEPPER` | any long random string, used to derive each account's hidden password. **Don't change it** without re-running the user seed |
| `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_HOST`, `SUPABASE_PROJECT_REF` | only for `db:migrate` (Supabase → Connect → session pooler) |

## Running locally

```bash
npm install
cp .env.example .env.local                 # then fill it in
npm run db:migrate                         # creates the tables, policies and storage bucket
npx tsx scripts/seed-users.ts              # creates the accounts in config/users.json
npm run dev                                # http://localhost:3000
```

## Accounts

Login is **name + class password** (`CLASS_PASSCODE`). Names live in [config/users.json](config/users.json):

```json
[{ "name": "Parth", "admin": true }, { "name": "Aman" }]
```

Then run `npx tsx scripts/seed-users.ts` (add `--prune` to delete accounts no longer listed).
Names are case-insensitive. Admins also see **Analytics** (sessions, time on site, solves, edits).

Behind the scenes each name is a real Supabase Auth user (`<name>@algoweb.local`) with a password derived
from `AUTH_PEPPER`, so row-level security works per person. In Supabase → Authentication → Sign In / Providers,
turn **off** "Allow new users to sign up"; even without that, accounts not created by the seed script see no data.

## Activity and wraps

**Activity** (header) shows your active time per day as a calendar (hover a day for its hours), totals and
streaks, and topic tracks (e.g. Trees → Binary Search Tree) with time spent and solved x/y. Time is logged
by a 30-second heartbeat only while the tab is visible and used in the last 5 minutes (`activity_log`,
via the `log_activity` function; each member sees only their own). Every Sunday a **weekly wrap** (the
previous Sunday–Saturday) and on the 1st a **monthly wrap** appear as a slim banner on the home page;
opening or closing it hides it for good (`wrap_views`). All wraps can be replayed from the Activity page.

## Permissions (enforced by RLS in [supabase/migrations](supabase/migrations))

- Questions, topics, links, statements: any signed-in member can add, edit, or delete. Every change goes to `audit_log` (the **History** tab).
- Public notes: everyone can read and edit. Only the owner can delete them or change visibility.
- Private notes: only the owner can see them. They are not written to the audit log.
- Progress ticks: private per person.
- Uploads: go to the public `media` bucket under the uploader's folder. URLs are public but unguessable.

## Adding questions written up by Claude

Send Claude the photo / DomJudge text / LeetCode link in chat. Claude follows
[prompts/process-question.txt](prompts/process-question.txt) (loaded via [CLAUDE.md](CLAUDE.md) in every session):
check for duplicates, look for the same LeetCode problem, and only otherwise write the question with
examples and diagrams. It writes `content/imports/<date>-<slug>.json`
(+ any SVG diagrams) and runs:

```bash
npx tsx scripts/import-question.ts content/imports/<file>.json [--as <username>]
```

Re-running the same file updates the same question. The format is documented in
[content/imports/README.md](content/imports/README.md).

## Scripts

| command | does |
|---|---|
| `npm run db:migrate` | applies new files in `supabase/migrations` |
| `npx tsx scripts/seed-users.ts [--prune \| --reset]` | syncs accounts with `config/users.json` (`--reset` deletes every account and its progress/notes/sessions first; questions stay) |
| `npx tsx scripts/import-question.ts <file>` | imports a Claude-written question (auto-fills from LeetCode when `leetcode_url` is set; refuses duplicates unless `--allow-duplicate`) |
| `npx tsx scripts/sync-intents.ts` | applies [content/intents.json](content/intents.json): the topic the teacher intends per question per email (shown first, highlighted) |
| `npx tsx scripts/find-question.ts <words or url>` | checks whether a question is already listed |
| `npx tsx scripts/leetcode.ts <slug or url>` | prints a LeetCode problem's statement and tags (to confirm a match) |
| `npm run check:rls` | end-to-end RLS test with throwaway users (cleans up after itself) |

(On Windows PowerShell, `npm run x -- --flag` drops the flag, so call `npx tsx …` directly when passing flags.)

## Deploying to Vercel

The Vercel project is connected to this GitHub repo: every push to `main` deploys to production
automatically, and other branches / pull requests get preview URLs. The env vars above (everything except
the three `SUPABASE_DB_*`/`PROJECT_REF` ones) are set in Vercel → Project → Settings → Environment Variables.
Database migrations are not run by the deploy; run `npm run db:migrate` yourself when you add one.
