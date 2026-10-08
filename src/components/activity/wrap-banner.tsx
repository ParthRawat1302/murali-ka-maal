"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { formatDuration, type Wrap } from "@/lib/activity";
import { supabaseBrowser } from "@/lib/supabase/client";
import { WrapStory } from "./wrap-story";

export function markWrapSeen(key: string) {
  supabaseBrowser().from("wrap_views").upsert({ wrap_key: key }, { onConflict: "user_id,wrap_key" }).then();
}

/** Slim strip on the home page announcing a new wrap. Viewing or closing it hides it for good. */
export function WrapBanner({ wraps }: { wraps: Wrap[] }) {
  const [pending, setPending] = useState(wraps);
  const [open, setOpen] = useState<Wrap | null>(null);
  const w = pending[0];

  function done(key: string) {
    markWrapSeen(key);
    setPending((p) => p.filter((x) => x.key !== key));
  }

  return (
    <>
      {w && (
        <div
          key={w.key}
          className="slide-down mb-4 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm"
        >
          <Sparkles size={16} className="shrink-0 text-accent" />
          <button
            className="min-w-0 flex-1 truncate text-left"
            onClick={() => {
              setOpen(w);
              done(w.key);
            }}
          >
            <b>Your {w.kind === "week" ? "weekly" : "monthly"} wrap is here</b>
            <span className="text-muted">
              {" "}
              · {w.title} · {formatDuration(w.seconds)}, {w.solved} solved
            </span>
          </button>
          <button
            className="btn-primary shrink-0 px-2.5 py-1 text-xs"
            onClick={() => {
              setOpen(w);
              done(w.key);
            }}
          >
            View
          </button>
          <button className="btn-ghost shrink-0 p-1" onClick={() => done(w.key)} aria-label="Dismiss" title="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
      {open && <WrapStory wrap={open} onClose={() => setOpen(null)} />}
    </>
  );
}
