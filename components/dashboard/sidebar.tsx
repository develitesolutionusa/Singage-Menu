"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  LayoutTemplate,
  Repeat,
  Megaphone,
  Monitor,
  UserRound,
} from "lucide-react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/loops", label: "Loops", icon: Repeat },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/players", label: "Players", icon: Monitor },
  { href: "/account", label: "Account", icon: UserRound },
] as const;

export function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500 text-sm font-semibold text-zinc-950">
          S
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-white">
            Signage Menu
          </p>
          <p className="text-[11px] text-zinc-400">Digital signage</p>
        </div>
      </div>

      <div className="border-b border-zinc-800 px-3 py-3">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/overview"
          afterCreateOrganizationUrl="/overview"
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-between rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100",
              organizationPreviewMainIdentifier: "text-zinc-100",
              organizationPreviewSecondaryIdentifier: "text-zinc-400",
            },
          }}
        />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-teal-500 text-zinc-950"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
