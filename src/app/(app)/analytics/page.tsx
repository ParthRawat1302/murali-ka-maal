import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { serverNow } from "@/lib/dates";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { SessionsTable, type SessionRow, type UserSummary } from "./sessions-table";

export const metadata: Metadata = { title: "Analytics · Murali ka maal" };

const ONLINE_MS = 2.5 * 60_000;

export default async function AnalyticsPage() {
  const profile = await requireProfile();
  if (!profile.is_admin) notFound();

  const supabase = await supabaseServer();
  const [sessions, people] = await Promise.all([
    supabase
      .from("app_sessions")
      .select("id, user_id, started_at, last_seen_at, ended_at, user_agent")
      .order("started_at", { ascending: false })
      .limit(1000),
    supabase.from("profiles").select("id, display_name, username").order("display_name"),
  ]);
  // Progress is private per user under RLS; the admin view reads aggregate counts with the secret key.
  const { data: solvedRows } = await supabaseAdmin().from("progress").select("user_id").eq("solved", true);
  const { data: editRows } = await supabaseAdmin().from("audit_log").select("changed_by").not("changed_by", "is", null);

  const rows = (sessions.data ?? []) as SessionRow[];
  const now = serverNow();
  const summaries: UserSummary[] = (people.data ?? []).map((p) => {
    const mine = rows.filter((s) => s.user_id === p.id);
    const totalMs = mine.reduce(
      (sum, s) => sum + (new Date(s.ended_at ?? s.last_seen_at).getTime() - new Date(s.started_at).getTime()),
      0,
    );
    const days = new Set(
      mine.map((s) => new Date(s.started_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })),
    );
    const last = mine[0]?.last_seen_at ?? null;
    return {
      id: p.id,
      name: p.display_name,
      sessions: mine.length,
      totalMs,
      activeDays: days.size,
      lastSeen: last,
      online: mine.some((s) => !s.ended_at && now - new Date(s.last_seen_at).getTime() < ONLINE_MS),
      solved: (solvedRows ?? []).filter((r) => r.user_id === p.id).length,
      edits: (editRows ?? []).filter((r) => r.changed_by === p.id).length,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          A session starts when someone opens the site and ends when they close the tab or log out. If the
          browser closes without telling us, the last heartbeat (every minute) stands in for the close time.
        </p>
      </div>
      <SessionsTable
        sessions={rows}
        summaries={summaries}
        people={Object.fromEntries((people.data ?? []).map((p) => [p.id, p.display_name]))}
        nowMs={now}
      />
    </div>
  );
}
