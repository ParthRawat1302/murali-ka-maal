// End-to-end RLS checks with throwaway users. Cleans up after itself.
// Usage: npm run check:rls
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { adminClient, need } from "./lib/env";

const admin = adminClient();
const stamp = Date.now();
const created: string[] = [];
let failures = 0;

function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

async function makeUser(tag: string, withProfile: boolean): Promise<SupabaseClient> {
  const email = `rlstest-${tag}-${stamp}@algoweb.local`;
  const password = `pw-${stamp}-${tag}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  if (withProfile) {
    const { error: pErr } = await admin
      .from("profiles")
      .insert({ id: data.user.id, username: `rlstest-${tag}-${stamp}`, display_name: `RLS ${tag}` });
    if (pErr) throw pErr;
  }
  const client = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;
  return client;
}

async function main() {
  const a = await makeUser("a", true);
  const b = await makeUser("b", true);
  const outsider = await makeUser("x", false);
  const anon = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"));

  // A creates a question + notes
  const { data: q, error: qErr } = await a
    .from("questions")
    .insert({ title: `RLS test ${stamp}`, difficulty: "easy", source_type: "other" })
    .select()
    .single();
  check("member can add a question", !qErr && !!q);
  const qid = q!.id as string;

  const { error: tErr } = await a.rpc("set_question_topics", { p_question: qid, p_names: ["Array", `RLS Topic ${stamp}`] });
  check("member can set topics (incl. new topic)", !tErr);

  const { data: priv } = await a
    .from("notes")
    .insert({ question_id: qid, visibility: "private", title: "A private", content: { type: "doc" } })
    .select()
    .single();
  const { data: pub } = await a
    .from("notes")
    .insert({ question_id: qid, visibility: "public", title: "A public", content: { type: "doc" } })
    .select()
    .single();
  check("member can add private + public notes", !!priv && !!pub);

  // B on A's notes
  const { data: bSees } = await b.from("notes").select("id").eq("question_id", qid);
  check("B sees A's public note but not the private one", bSees?.length === 1 && bSees[0].id === pub!.id);

  const { data: bPrivUpd } = await b.from("notes").update({ title: "hacked" }).eq("id", priv!.id).select();
  check("B cannot update A's private note", (bPrivUpd ?? []).length === 0);

  const { data: bPubUpd } = await b.from("notes").update({ title: "B edited" }).eq("id", pub!.id).select();
  check("B can edit A's public note", (bPubUpd ?? []).length === 1);

  const { error: visErr } = await b.from("notes").update({ visibility: "private" }).eq("id", pub!.id);
  check("B cannot change visibility of A's note", !!visErr);

  const { data: bDel } = await b.from("notes").delete().eq("id", pub!.id).select();
  check("B cannot delete A's note", (bDel ?? []).length === 0);

  const { data: audit } = await b.from("audit_log").select("action, table_name, changes").eq("question_id", qid);
  check(
    "B's public-note edit is in audit_log",
    !!audit?.some((r) => r.table_name === "notes" && r.action === "update" && r.changes?.title?.to === "B edited"),
  );
  check("private note never audited", !audit?.some((r) => r.changes?.title === "A private"));
  check("topic changes audited", !!audit?.some((r) => r.action === "topic_add"));

  // Progress
  const { error: progErr } = await a.from("progress").upsert({ question_id: qid, solved: true });
  check("A can tick own progress", !progErr);
  const { data: bProg } = await b.from("progress").select("*");
  check("B cannot read A's progress", (bProg ?? []).every((r) => r.user_id !== created[0]));
  const { error: bProgWrite } = await b.from("progress").insert({ user_id: created[0], question_id: qid, solved: false });
  check("B cannot write A's progress", !!bProgWrite);

  const { data: act } = await a.from("activity_days").select("*").eq("user_id", created[0]);
  check("activity_days shows A's solve", !!act?.some((r) => r.solves >= 1));

  // Sessions
  const { data: sess } = await a.from("app_sessions").insert({ user_agent: "rls-check" }).select().single();
  check("A can start a session", !!sess);
  const { data: bSess } = await b.from("app_sessions").select("id").eq("id", sess!.id);
  check("non-admin B cannot see A's session", (bSess ?? []).length === 0);

  // Outsiders
  for (const [name, c] of [["auth user without profile", outsider], ["anonymous", anon]] as const) {
    const { data: oq } = await c.from("questions").select("id");
    const { data: on } = await c.from("notes").select("id");
    check(`${name} sees no questions/notes`, (oq ?? []).length === 0 && (on ?? []).length === 0);
    const { data: oIns } = await c.from("questions").insert({ title: "outsider" }).select();
    check(`${name} cannot add questions`, (oIns ?? []).length === 0);
  }

  // Storage
  const uidA = created[0];
  const up = await a.storage.from("media").upload(`${uidA}/rls-${stamp}.txt`, new Blob(["hi"]), { contentType: "text/plain" });
  check("A can upload to own folder", !up.error);
  const upOther = await b.storage.from("media").upload(`${uidA}/rls-b-${stamp}.txt`, new Blob(["hi"]));
  check("B cannot upload into A's folder", !!upOther.error);
  const upOut = await outsider.storage.from("media").upload(`${created[2]}/x.txt`, new Blob(["hi"]));
  check("outsider cannot upload", !!upOut.error);
  const pubUrl = a.storage.from("media").getPublicUrl(`${uidA}/rls-${stamp}.txt`).data.publicUrl;
  const res = await fetch(pubUrl);
  check("uploaded file has a working public URL", res.ok && (await res.text()) === "hi");
  await admin.storage.from("media").remove([`${uidA}/rls-${stamp}.txt`]);

  // Cleanup
  await admin.from("questions").delete().eq("id", qid);
  await admin.from("topics").delete().eq("name", `RLS Topic ${stamp}`);
  await admin.from("audit_log").delete().eq("question_id", qid);
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(async () => {
    for (const id of created) {
      await admin.from("audit_log").delete().eq("changed_by", id);
      await admin.auth.admin.deleteUser(id);
    }
    console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
    process.exit(failures ? 1 : 0);
  });
