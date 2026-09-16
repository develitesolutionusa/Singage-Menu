"use client";

import { usePathname } from "next/navigation";
import { OrgGate } from "@/components/dashboard/org-gate";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <Sidebar pathname={pathname} />
      <main className="flex min-w-0 flex-1 flex-col">
        <OrgGate>
          <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
            {children}
          </div>
        </OrgGate>
      </main>
    </div>
  );
}
