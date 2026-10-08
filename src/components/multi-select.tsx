"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

/** Searchable multi-select. With `allowCreate`, typing a new name and pressing Enter adds it. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  allowCreate = false,
  className = "",
  children,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const lower = new Set(value.map((v) => v.toLowerCase()));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.toLowerCase().includes(q)).slice(0, 200);
  }, [options, query]);
  const canCreate =
    allowCreate && query.trim() && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  function toggle(o: string) {
    onChange(lower.has(o.toLowerCase()) ? value.filter((v) => v.toLowerCase() !== o.toLowerCase()) : [...value, o]);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex w-full min-w-0 items-center gap-1 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1">
          {value.length === 0 && <span className="text-muted">{placeholder}</span>}
          {value.map((v) => (
            <span key={v} className="chip text-fg">
              {v}
              <X
                size={12}
                className="cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
              />
            </span>
          ))}
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="card absolute left-0 z-40 mt-1 w-full min-w-56 overflow-hidden p-1 shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canCreate) {
                  onChange([...value, query.trim()]);
                  setQuery("");
                } else if (filtered[0]) toggle(filtered[0]);
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder={allowCreate ? "Search or add…" : "Search…"}
            className="input mb-1 w-full py-1.5"
          />
          {children}
          <div className="max-h-64 overflow-y-auto">
            {canCreate && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                onClick={() => {
                  onChange([...value, query.trim()]);
                  setQuery("");
                }}
              >
                <Plus size={14} /> Add “{query.trim()}”
              </button>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => toggle(o)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    lower.has(o.toLowerCase()) ? "border-accent bg-accent text-accent-fg" : "border-border"
                  }`}
                >
                  {lower.has(o.toLowerCase()) && <Check size={12} />}
                </span>
                {o}
              </button>
            ))}
            {!filtered.length && !canCreate && <p className="px-2 py-1.5 text-sm text-muted">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}
