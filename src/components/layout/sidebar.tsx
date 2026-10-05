"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardCheck,
  FileStack,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  BookOpenCheck,
  X,
} from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { MemberRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: MemberRole[];
  badge?: number;
};

export function Sidebar({
  role,
  user,
  organizationName,
  pendingReviewCount,
  logoutSlot,
}: {
  role: MemberRole;
  user: { name: string; email: string; roleLabel: string };
  organizationName: string;
  pendingReviewCount: number;
  logoutSlot: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/submissions", label: "Submissions", icon: FileStack },
    {
      href: "/review-queue",
      label: "Review Queue",
      icon: ClipboardCheck,
      roles: ["compliance", "admin"],
      badge: pendingReviewCount,
    },
    { href: "/brands", label: "Brands", icon: Tag },
    { href: "/policies", label: "Policies", icon: BookOpenCheck },
    { href: "/audit-log", label: "Audit Log", icon: ScrollText, roles: ["compliance", "admin"] },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  const visible = items.filter((item) => !item.roles || item.roles.includes(role));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-zinc-200/70 text-ink"
                : "text-ink-muted hover:bg-zinc-200/50 hover:text-ink",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-brand-600 px-1.5 text-[11px] leading-5 font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const header = (
    <div className="flex items-center gap-2 px-5 py-4">
      <div className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-white">
        <ShieldCheck className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold text-ink">Compliance Hub</p>
        <p className="truncate text-[11px] text-ink-subtle">{organizationName}</p>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {user.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13px] font-medium text-ink" data-testid="current-user">
            {user.name || user.email}
          </p>
          <p className="truncate text-[11px] text-ink-subtle">{user.roleLabel}</p>
        </div>
      </div>
      <div className="mt-1">{logoutSlot}</div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4" aria-hidden /> Compliance Hub
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-ink-muted hover:bg-zinc-100"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-canvas shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {header}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-canvas lg:flex">
        {header}
        {nav}
        {footer}
      </aside>
    </>
  );
}
