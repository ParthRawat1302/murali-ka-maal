"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Activity, BarChart3, ListChecks, LogOut, Plus, Trophy } from "lucide-react";
import { logout } from "@/app/login/actions";
import { takeSession, useApp } from "./app-context";
import { ThemeToggle } from "./theme-toggle";
import { startNavProgress } from "./nav-progress";

export function Header() {
  const { profile } = useApp();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  const links = [
    { href: "/", label: "Questions", icon: ListChecks },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/add", label: "Add", icon: Plus },
    ...(profile.is_admin ? [{ href: "/analytics", label: "Analytics", icon: BarChart3 }] : []),
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-3 flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
            {"{}"}
          </span>
          <span>Murali ka maal</span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`btn-ghost ${isActive(href) ? "bg-surface-2 text-fg" : ""}`}>
              <Icon size={16} />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">{profile.display_name}</span>
          <ThemeToggle />
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                startNavProgress();
                const id = await takeSession();
                await logout(id ?? undefined);
              })
            }
            title="Log out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>

    {/* phones: app-style tab bar */}
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
            isActive(href) ? "text-accent" : "text-muted"
          }`}
        >
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
    </>
  );
}
