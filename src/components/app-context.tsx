"use client";

import { createContext, use, useEffect, useRef, type ReactNode } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type AppCtx = {
  profile: Profile;
  people: Record<string, string>;
};

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const v = use(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

const SESSION_KEY = "algoweb.session";
const HEARTBEAT_MS = 60_000;

// Shared across effect re-runs (React dev mode mounts twice) so one page load is one session.
let starting: { user: string; promise: Promise<string | null> } | null = null;

/** On logout: returns this tab's session id and forgets it so the next login opens a fresh one. */
export async function takeSession(): Promise<string | null> {
  const id = starting ? await starting.promise : null;
  starting = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  return id;
}

async function openSession(userId: string): Promise<string | null> {
  const supabase = supabaseBrowser();
  let id: string | null = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    if (saved?.user === userId) id = saved.id;
  } catch {}
  if (id) {
    const { data } = await supabase
      .from("app_sessions")
      .update({ ended_at: null, last_seen_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");
    if (!data?.length) id = null;
  }
  if (!id) {
    const { data } = await supabase
      .from("app_sessions")
      .insert({ user_agent: navigator.userAgent.slice(0, 300) })
      .select("id")
      .single();
    id = data?.id ?? null;
  }
  if (id) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, user: userId }));
    } catch {}
  }
  return id;
}

export function AppProvider({
  profile,
  people,
  children,
}: {
  profile: Profile;
  people: { id: string; display_name: string }[];
  children: ReactNode;
}) {
  const idRef = useRef<string | null>(null);

  // One analytics session per tab. A reload re-opens the same row.
  useEffect(() => {
    const supabase = supabaseBrowser();
    let stopped = false;

    async function start() {
      if (starting?.user !== profile.id) starting = { user: profile.id, promise: openSession(profile.id) };
      const id = await starting.promise;
      if (stopped || !id) return;
      idRef.current = id;
    }

    function beat() {
      if (!idRef.current || document.visibilityState !== "visible") return;
      supabase
        .from("app_sessions")
        .update({ last_seen_at: new Date().toISOString(), ended_at: null })
        .eq("id", idRef.current)
        .then();
    }

    function end() {
      if (!idRef.current) return;
      navigator.sendBeacon("/api/session/end", JSON.stringify({ id: idRef.current }));
    }

    start();
    const timer = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === "visible" && beat();
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", end);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [profile.id]);

  const peopleMap = Object.fromEntries(people.map((p) => [p.id, p.display_name]));
  return <Ctx value={{ profile, people: peopleMap }}>{children}</Ctx>;
}
