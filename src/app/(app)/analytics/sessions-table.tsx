"use client";

import { device } from "@/lib/device";
import { useState } from "react";
import { formatDateTime, formatDuration, timeAgo } from "@/lib/dates";

export type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  user_agent: string | null;
};

export type UserSummary = {
  id: string;
  name: string;
  sessions: number;
  totalMs: number;
  activeDays: number;
  lastSeen: string | null;
  online: boolean;
  solved: number;
  edits: number;
};


export function SessionsTable({
  sessions,
  summaries,
  people,
  nowMs,
}: {
  sessions: SessionRow[];
  summaries: UserSummary[];
  people: Record<string, string>;
  nowMs: number;
}) {
  const [user, setUser] = useState("");
  const shown = user ? sessions.filter((s) => s.user_id === user) : sessions;

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Sessions</th>
              <th className="px-4 py-2 text-right font-medium">Time on site</th>
              <th className="px-4 py-2 text-right font-medium">Active days</th>
              <th className="px-4 py-2 text-right font-medium">Solved</th>
              <th className="px-4 py-2 text-right font-medium">Edits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summaries.map((s) => (
              <tr
                key={s.id}
                className={`cursor-pointer hover:bg-surface-2/50 ${user === s.id ? "bg-surface-2/70" : ""}`}
                onClick={() => setUser(user === s.id ? "" : s.id)}
              >
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2">
                  {s.online ? (
                    <span className="inline-flex items-center gap-1.5 text-easy">
                      <span className="h-2 w-2 rounded-full bg-easy" /> Online
                    </span>
                  ) : (
                    <span className="text-muted">{s.lastSeen ? `Seen ${timeAgo(s.lastSeen)}` : "Never"}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{s.sessions}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatDuration(s.totalMs)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.activeDays}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.solved}</td>
                <td className="px-4 py-2 text-right tabular-nums">{s.edits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Sessions {user && <span className="font-normal text-muted">· {people[user]}</span>}
        </h2>
        {user && (
          <button className="btn-ghost" onClick={() => setUser("")}>
            Show everyone
          </button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Opened</th>
              <th className="px-4 py-2 font-medium">Last active</th>
              <th className="px-4 py-2 font-medium">Closed</th>
              <th className="px-4 py-2 text-right font-medium">Duration</th>
              <th className="px-4 py-2 font-medium">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((s) => {
              const open = !s.ended_at && nowMs - new Date(s.last_seen_at).getTime() < 2.5 * 60_000;
              const end = s.ended_at ?? s.last_seen_at;
              return (
                <tr key={s.id}>
                  <td className="px-4 py-2">{people[s.user_id] ?? "—"}</td>
                  <td className="px-4 py-2 tabular-nums">{formatDateTime(s.started_at)}</td>
                  <td className="px-4 py-2 tabular-nums">{formatDateTime(s.last_seen_at)}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {open ? (
                      <span className="text-easy">still open</span>
                    ) : s.ended_at ? (
                      formatDateTime(s.ended_at)
                    ) : (
                      <span className="text-muted" title="Browser closed without notifying; using last heartbeat">
                        ~{formatDateTime(s.last_seen_at)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatDuration(new Date(end).getTime() - new Date(s.started_at).getTime())}
                  </td>
                  <td className="px-4 py-2 text-muted">{device(s.user_agent)}</td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No sessions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
