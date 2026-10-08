// Applies supabase/migrations/*.sql in order, once each.
// Usage: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pgClient } from "./lib/env";

const dir = join(process.cwd(), "supabase", "migrations");

async function main() {
  const db = await pgClient();
  try {
    await db.query(`
      create schema if not exists app_private;
      create table if not exists app_private.migrations (
        name text primary key, applied_at timestamptz not null default now()
      );`);
    const done = new Set(
      (await db.query<{ name: string }>("select name from app_private.migrations")).rows.map((r) => r.name),
    );
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      console.log(`applying ${file}`);
      await db.query("begin");
      try {
        await db.query(readFileSync(join(dir, file), "utf8"));
        await db.query("insert into app_private.migrations (name) values ($1)", [file]);
        await db.query("commit");
      } catch (e) {
        await db.query("rollback");
        throw e;
      }
    }
    console.log("migrations up to date");
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
