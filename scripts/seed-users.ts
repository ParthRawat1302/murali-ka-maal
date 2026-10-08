// Creates/updates the login accounts listed in config/users.json.
// Usage: npm run users:seed            (add or update)
//        npm run users:seed -- --prune (also delete accounts no longer listed)
//        npm run users:seed -- --reset (delete every account first, with its progress, notes and sessions;
//                                       questions stay, their created_by/updated_by become null)
import { readFileSync } from "node:fs";
import { adminClient, userEmail, userPassword } from "./lib/env";

type Entry = { name: string; admin?: boolean };

// Must match usernameFromName in src/lib/auth.ts
function usernameFromName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
}

async function main() {
  const prune = process.argv.includes("--prune");
  const reset = process.argv.includes("--reset");
  const entries: Entry[] = JSON.parse(readFileSync("config/users.json", "utf8"));
  const supabase = adminClient();

  let { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  if (reset) {
    for (const u of list.users) {
      const { error } = await supabase.auth.admin.deleteUser(u.id);
      if (error) throw error;
      console.log(`✗ removed ${u.email}`);
    }
    ({ data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 }));
    if (listErr) throw listErr;
  }
  const byEmail = new Map(list.users.map((u) => [u.email, u]));
  const keep = new Set<string>();

  for (const e of entries) {
    const username = usernameFromName(e.name);
    if (!username) throw new Error(`Bad name: ${e.name}`);
    const email = userEmail(username);
    keep.add(email);
    let id = byEmail.get(email)?.id;
    if (id) {
      const { error } = await supabase.auth.admin.updateUserById(id, { password: userPassword(username) });
      if (error) throw error;
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: userPassword(username),
        email_confirm: true,
        user_metadata: { display_name: e.name.trim() },
      });
      if (error) throw error;
      id = data.user.id;
    }
    const { error: pErr } = await supabase.from("profiles").upsert({
      id,
      username,
      display_name: e.name.trim(),
      is_admin: !!e.admin,
    });
    if (pErr) throw pErr;
    console.log(`✓ ${e.name.trim()} (${username})${e.admin ? " [admin]" : ""}`);
  }

  if (prune) {
    for (const u of list.users) {
      if (u.email?.endsWith("@algoweb.local") && !keep.has(u.email)) {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (error) throw error;
        console.log(`✗ removed ${u.email}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
