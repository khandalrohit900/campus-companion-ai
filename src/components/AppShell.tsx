import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { useCampus } from "@/lib/campus-store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tutor", label: "AI Tutor", icon: Sparkles },
  { to: "/subjects", label: "Subjects", icon: BookOpen },
  { to: "/planner", label: "Planner", icon: CalendarDays },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/progress", label: "Progress", icon: BarChart3 },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  const { studentName } = useCampus();

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="font-display text-lg leading-none font-semibold tracking-tight">
            CampusMate <span className="text-primary">AI</span>
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
              }}
              className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent/70"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden px-5 pb-6 lg:block">
          <p className="rounded-xl border border-sidebar-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
            Everything you add is saved in this browser only — no account needed.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {studentName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-muted-foreground">{studentName}</span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
