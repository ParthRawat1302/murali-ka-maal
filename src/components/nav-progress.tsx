"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Call before a programmatic navigation (router.push / refresh) to show the top bar. */
export function startNavProgress() {
  window.dispatchEvent(new Event("nav-progress:start"));
}

/**
 * A thin bar along the top edge while a page is loading. It never covers content:
 * it trickles towards 90%, completes when the new route renders, then fades out.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  useEffect(() => {
    function start() {
      if (active.current) return;
      active.current = true;
      setVisible(true);
      setWidth(8);
      timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.08 : w)), 200);
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-file-attachment")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    window.addEventListener("nav-progress:start", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("nav-progress:start", start);
    };
  }, []);

  // the route changed: finish the bar
  useEffect(() => {
    if (!active.current) return;
    active.current = false;
    if (timer.current) clearInterval(timer.current);
    setWidth(100);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setWidth(0), 250);
    }, 220);
    return () => clearTimeout(t);
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 250ms ease" }}
    >
      <div
        className="h-full bg-accent shadow-[0_0_8px_var(--accent)]"
        style={{ width: `${width}%`, transition: width === 0 ? "none" : "width 220ms ease-out" }}
      />
    </div>
  );
}
