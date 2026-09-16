"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { FolderOpen, Megaphone, Monitor, Repeat } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { formatBytes } from "@/lib/utils";
import type { ActivityLog, Announcement } from "@/types/db";

type OverviewData = {
  stats: {
    librarySizeBytes: number;
    loopsCount: number;
    playersCount: number;
    campaignsCount: number;
  };
  activities: ActivityLog[];
  announcements: Announcement[];
};

export function OverviewClient() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/overview");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load overview");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    {
      label: "Library",
      value: data ? formatBytes(data.stats.librarySizeBytes) : "—",
      icon: FolderOpen,
    },
    {
      label: "Loops",
      value: data ? String(data.stats.loopsCount) : "—",
      icon: Repeat,
    },
    {
      label: "Players",
      value: data ? String(data.stats.playersCount) : "—",
      icon: Monitor,
    },
    {
      label: "Campaigns",
      value: data ? String(data.stats.campaignsCount) : "0",
      icon: Megaphone,
      hint: "Coming in Phase 3",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Org snapshot across library, loops, and players."
      />

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-teal-700" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            {"hint" in stat && stat.hint ? (
              <p className="mt-1 text-xs text-zinc-400">{stat.hint}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-zinc-200">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {(data?.activities ?? []).length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                No activity yet. Upload media or pair a player to get started.
              </li>
            ) : (
              data?.activities.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm text-zinc-800">{item.action}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-zinc-200">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">Announcements</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {(data?.announcements ?? []).length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">
                No announcements right now.
              </li>
            ) : (
              data?.announcements.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{item.body}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
