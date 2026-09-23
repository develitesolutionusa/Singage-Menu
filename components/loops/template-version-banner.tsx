"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  GitBranch,
  Link2Off,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import type {
  TemplateVersionChange,
  TemplateVersionPreview,
  TemplateVersionStatus,
} from "@/lib/template-versioning";
import type { LoopItem } from "@/types/db";
import { cn } from "@/lib/utils";

type VersionAction = "update" | "keep" | "detach";

function changeBadge(action: TemplateVersionChange["action"]) {
  if (action === "added") return "bg-emerald-50 text-emerald-800";
  if (action === "removed") return "bg-red-50 text-red-800";
  return "bg-amber-50 text-amber-900";
}

export function TemplateVersionOutdatedBadge({
  status,
  className,
}: {
  status?: TemplateVersionStatus | null;
  className?: string;
}) {
  if (!status?.needsAttention) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900",
        className,
      )}
      title={`Template v${status.instanceVersion} → v${status.masterVersion} available`}
    >
      <AlertTriangle className="h-3 w-3" />
      Update
    </span>
  );
}

export function TemplateVersionBanner({
  loopId,
  item,
  className,
  onItemUpdated,
}: {
  loopId: string;
  item: LoopItem | null;
  className?: string;
  onItemUpdated: (item: LoopItem) => void;
}) {
  const status = item?.template_version_status ?? null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<TemplateVersionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busyAction, setBusyAction] = useState<VersionAction | null>(null);

  const showBanner =
    Boolean(item?.item_type === "design" && item.source_template_id) &&
    Boolean(status?.needsAttention || status?.acknowledged);

  const loadPreview = useCallback(async () => {
    if (!item) return;
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await fetch(
        `/api/loops/${loopId}/items/${item.id}/template-version`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load changes");
      setPreview((json.preview ?? json.status) as TemplateVersionPreview);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load changes");
      setDialogOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  }, [item, loopId]);

  useEffect(() => {
    if (!dialogOpen) return;
    void loadPreview();
  }, [dialogOpen, loadPreview]);

  async function runAction(action: VersionAction) {
    if (!item) return;
    setBusyAction(action);
    try {
      const res = await fetch(
        `/api/loops/${loopId}/items/${item.id}/template-version`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Action failed");

      const next = {
        ...(json.item as LoopItem),
        template_version_status: json.status as TemplateVersionStatus,
      };
      onItemUpdated(next);
      setDialogOpen(false);

      if (action === "update") {
        toast.success("Updated to latest template", {
          description:
            json.preservedCount != null
              ? `${json.preservedCount} content override(s) preserved`
              : undefined,
        });
      } else if (action === "keep") {
        toast.message("Keeping current template version");
      } else {
        toast.success("Detached from master template");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyAction(null);
    }
  }

  if (!showBanner || !status || !item) return null;

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-xs",
          status.needsAttention
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-zinc-200 bg-zinc-50 text-zinc-800",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-semibold">
          {status.needsAttention ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <GitBranch className="h-3.5 w-3.5" />
          )}
          Template version
        </span>
        <span className="opacity-80">
          {status.templateName ?? "Template"} · slide v
          {status.instanceVersion ?? "?"}
          {status.masterVersion != null
            ? ` · master v${status.masterVersion}`
            : ""}
        </span>
        {status.needsAttention ? (
          <span className="opacity-80">
            A newer master template is available. Review changes before
            updating.
          </span>
        ) : (
          <span className="opacity-80">
            You chose to keep the current version for now.
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {status.needsAttention || status.acknowledged ? (
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => setDialogOpen(true)}
            >
              Review changes
            </Button>
          ) : null}
          {status.needsAttention ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={busyAction != null}
                onClick={() => void runAction("keep")}
              >
                Keep current
              </Button>
              <Button
                type="button"
                className="h-7 px-2 text-xs"
                disabled={busyAction != null}
                onClick={() => setDialogOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Update to latest
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-zinc-900/40"
            onClick={() => {
              if (!busyAction) setDialogOpen(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-version-dialog-title"
            className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2
                id="template-version-dialog-title"
                className="text-base font-semibold text-zinc-900"
              >
                Template update available
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {status.templateName ?? "Template"} · v
                {status.instanceVersion ?? "?"} → v
                {status.masterVersion ?? "?"}
              </p>
              <p className="mt-2 text-sm text-zinc-600">
                Your content overrides are preserved where field ids still
                exist. Nothing is overwritten until you confirm.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading change preview…
                </div>
              ) : preview ? (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      What will change
                    </p>
                    {preview.changes.length === 0 ? (
                      <p className="text-sm text-zinc-600">
                        No structural differences detected beyond the version
                        bump.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {preview.changes.map((change, index) => (
                          <li
                            key={`${change.kind}-${change.label}-${index}`}
                            className="flex items-start gap-2 rounded-md border border-zinc-100 px-2.5 py-2 text-sm"
                          >
                            <span
                              className={cn(
                                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                changeBadge(change.action),
                              )}
                            >
                              {change.action}
                            </span>
                            <span className="min-w-0">
                              <span className="font-medium text-zinc-900">
                                {change.label}
                              </span>
                              {change.detail ? (
                                <span className="mt-0.5 block text-xs text-zinc-500">
                                  {change.detail}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {preview.preservedOverrides.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Content preserved ({preview.preservedOverrides.length})
                      </p>
                      <ul className="space-y-1.5">
                        {preview.preservedOverrides.slice(0, 8).map((row) => (
                          <li
                            key={row.id}
                            className="truncate text-sm text-zinc-700"
                          >
                            <span className="font-medium">{row.label}</span>
                            <span className="text-zinc-400"> · </span>
                            <span className="text-zinc-500">{row.value}</span>
                          </li>
                        ))}
                        {preview.preservedOverrides.length > 8 ? (
                          <li className="text-xs text-zinc-500">
                            +{preview.preservedOverrides.length - 8} more
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      No instance content overrides to preserve (or fields were
                      removed from the master).
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No preview available.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                disabled={busyAction != null}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busyAction != null}
                onClick={() => void runAction("detach")}
              >
                {busyAction === "detach" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2Off className="h-4 w-4" />
                )}
                Detach
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busyAction != null}
                onClick={() => void runAction("keep")}
              >
                {busyAction === "keep" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Keep current
              </Button>
              <Button
                type="button"
                disabled={busyAction != null}
                onClick={() => void runAction("update")}
              >
                {busyAction === "update" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Update to latest
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
