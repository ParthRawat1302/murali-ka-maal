"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LogIn, Monitor, Smartphone } from "lucide-react";
import { formatDuration, istDay } from "@/lib/activity";
import { formatDay } from "@/lib/dates";
import { device } from "@/lib/device";
import { supabaseBrowser } from "@/lib/supabase/client";

const PAGE = 15;
// A session still being heartbeated in the last 3 minutes counts as open now.
const LIVE_MS = 3 * 60_000;

type Session = { id: string; started_at: string; last_seen_at: string; ended_at: string | null; user_agent: string | null };

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton h-3 w-12" />
    </div>
  );
}

/** When the site was opened, newest first. Loads a page at a time as you scroll. */
export function SessionLog({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [now] = useState(() => Date.now());
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    const from = rows.length;
    const { data } = await supabaseBrowser()
      .from("app_sessions")
      .select("id, started_at, last_seen_at, ended_at, user_agent")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .range(from, from + PAGE - 1);
    const page = (data ?? []) as Session[];
    setRows((r) => [...r, ...page.filter((p) => !r.some((x) => x.id === p.id))]);
    if (page.length < PAGE) setDone(true);
    setLoading(false);
    busy.current = false;
  }, [rows.length, done, userId]);

  // load the next page when the bottom of the list scrolls into view
  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, done]);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="font-semibold">Session history</h2>
        <span className="text-xs text-muted">every time you opened the site</span>
      </div>
      <div className="card divide-y divide-border overflow-hidden">
        {rows.map((s, i) => {
          const day = istDay(s.started_at);
          const header = i === 0 || istDay(rows[i - 1].started_at) !== day;
          const end = s.ended_at ?? s.last_seen_at;
          const live = !s.ended_at && now - Date.parse(s.last_seen_at) < LIVE_MS;
          const secs = Math.max(0, (Date.parse(end) - Date.parse(s.started_at)) / 1000);
          const mobile = /Android|iPhone|iPad/.test(s.user_agent ?? "");
          const Icon = mobile ? Smartphone : Monitor;
          return (
            <div key={s.id} className="page-enter">
              {header && (
                <div className="bg-surface-2/60 px-4 py-1.5 text-xs font-medium text-muted">{formatDay(day)}</div>
              )}
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <LogIn size={13} className="text-muted" />
                    Opened at <b>{time(s.started_at)}</b>
                    {live ? (
                      <span className="chip-intended ml-1">open now</span>
                    ) : (
                      <span className="text-muted">· until {time(end)}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{device(s.user_agent)}</div>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted">{formatDuration(Math.round(secs))}</span>
              </div>
            </div>
          );
        })}
        {loading && Array.from({ length: rows.length ? 3 : 5 }, (_, i) => <RowSkeleton key={`sk-${i}`} />)}
        {done && rows.length === 0 && <p className="p-6 text-center text-sm text-muted">No sessions yet.</p>}
        {done && rows.length > 0 && <p className="py-3 text-center text-xs text-muted">That&apos;s everything.</p>}
      </div>
      {!done && <div ref={sentinel} className="h-1" />}
    </section>
  );
}
