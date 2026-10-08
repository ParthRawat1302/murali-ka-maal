import { supabaseServer } from "@/lib/supabase/server";

// Called with navigator.sendBeacon when a tab closes. RLS limits it to the caller's own session.
export async function POST(request: Request) {
  let id: unknown;
  try {
    id = JSON.parse(await request.text())?.id;
  } catch {}
  if (typeof id !== "string") return new Response(null, { status: 400 });

  const supabase = await supabaseServer();
  const now = new Date().toISOString();
  await supabase.from("app_sessions").update({ ended_at: now, last_seen_at: now }).eq("id", id);
  return new Response(null, { status: 204 });
}
