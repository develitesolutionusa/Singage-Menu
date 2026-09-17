"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { OrgGate } from "@/components/dashboard/org-gate";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <Sidebar pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-end border-b border-zinc-200 bg-white px-6">
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/account"
            appearance={{
              elements: { userButtonAvatarBox: "h-8 w-8" },
            }}
          />
        </header>
        <main className="flex min-w-0 flex-1 flex-col">
          <OrgGate>
            <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
              {children}
            </div>
          </OrgGate>
        </main>
      </div>
    </div>
  );
}
