"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, LayoutTemplate, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TEMPLATE_INDUSTRIES, type TemplateListItem } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { Loop, Orientation } from "@/types/db";

type UseMode = "existing" | "new";

export function TemplatesClient() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preview, setPreview] = useState<TemplateListItem | null>(null);
  const [useTarget, setUseTarget] = useState<TemplateListItem | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [useMode, setUseMode] = useState<UseMode>("new");
  const [selectedLoopId, setSelectedLoopId] = useState("");
  const [newLoopName, setNewLoopName] = useState("");
  const [newOrientation, setNewOrientation] =
    useState<Orientation>("landscape");
  const [using, setUsing] = useState(false);
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(
    null,
  );

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (industry) params.set("industry", industry);
      if (category) params.set("category", category);
      if (favoritesOnly) params.set("favoritesOnly", "true");

      const res = await fetch(`/api/templates?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load templates");
      setTemplates(json.templates ?? []);
      setCategories(json.categories ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadTemplates();
    }, 200);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, industry, category, favoritesOnly]);

  useEffect(() => {
    setCategory("");
  }, [industry]);

  const industryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of templates) {
      map.set(t.industry, (map.get(t.industry) ?? 0) + 1);
    }
    return map;
  }, [templates]);

  async function toggleFavorite(template: TemplateListItem) {
    setTogglingFavoriteId(template.id);
    try {
      const res = await fetch(`/api/templates/${template.id}/favorite`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not update favorite");
      setTemplates((prev) =>
        prev
          .map((t) =>
            t.id === template.id
              ? { ...t, is_favorited: Boolean(json.favorited) }
              : t,
          )
          .filter((t) => (favoritesOnly ? t.is_favorited : true)),
      );
      if (preview?.id === template.id) {
        setPreview((p) =>
          p ? { ...p, is_favorited: Boolean(json.favorited) } : p,
        );
      }
      toast.success(json.favorited ? "Added to favorites" : "Removed from favorites");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update favorite");
    } finally {
      setTogglingFavoriteId(null);
    }
  }

  async function openUseDialog(template: TemplateListItem) {
    setUseTarget(template);
    setUseMode("new");
    setNewLoopName(template.name);
    setNewOrientation(template.orientation);
    setSelectedLoopId("");
    try {
      const res = await fetch("/api/loops");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load loops");
      const list = (json.loops ?? []) as Loop[];
      setLoops(list);
      if (list.length) {
        setSelectedLoopId(list[0].id);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load loops");
      setLoops([]);
    }
  }

  async function confirmUse() {
    if (!useTarget) return;
    if (useMode === "existing" && !selectedLoopId) {
      toast.error("Select a loop");
      return;
    }

    setUsing(true);
    try {
      const payload =
        useMode === "existing"
          ? { mode: "existing" as const, loopId: selectedLoopId }
          : {
              mode: "new" as const,
              loopName: newLoopName.trim() || useTarget.name,
              orientation: newOrientation,
            };

      const res = await fetch(`/api/templates/${useTarget.id}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not use template");

      toast.success(
        json.createdNew
          ? "Loop created with template slide"
          : "Template added to loop",
      );
      setUseTarget(null);
      router.push(`/loops/${json.loopId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not use template");
    } finally {
      setUsing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Template Library"
        description="Start from industry-ready layouts, then add them to a loop."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates, tags, categories…"
            className="pl-9"
          />
        </div>
        <Select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full lg:w-52"
        >
          <option value="">All industries</option>
          {TEMPLATE_INDUSTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full lg:w-44"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant={favoritesOnly ? "primary" : "secondary"}
          onClick={() => setFavoritesOnly((v) => !v)}
          className="shrink-0"
        >
          <Heart
            className={cn("h-4 w-4", favoritesOnly && "fill-current")}
          />
          Favorites
        </Button>
      </div>

      {error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates found"
          description={
            favoritesOnly
              ? "You haven’t favorited any templates yet."
              : industry
                ? `No starter templates for ${industry} yet. Try Restaurant & Food.`
                : "Try adjusting your search or filters."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-teal-600/40 hover:shadow-md"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setPreview(template)}
              >
                <div className="aspect-video w-full border-b border-zinc-100">
                  <TemplatePreview
                    data={template.design_data}
                    className="h-full w-full"
                  />
                </div>
              </button>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-zinc-900">
                      {template.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {template.industry} · {template.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      template.is_favorited
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    disabled={togglingFavoriteId === template.id}
                    onClick={() => void toggleFavorite(template)}
                    className={cn(
                      "rounded-md p-1.5 transition",
                      template.is_favorited
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-zinc-400 hover:bg-zinc-100 hover:text-rose-600",
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        template.is_favorited && "fill-current",
                      )}
                    />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setPreview(template)}
                  >
                    Preview
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => void openUseDialog(template)}
                  >
                    <LayoutTemplate className="h-4 w-4" />
                    Use Template
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !industry && templates.length > 0 ? (
        <p className="mt-4 text-xs text-zinc-400">
          Showing {templates.length} templates
          {industryCounts.size
            ? ` across ${industryCounts.size} industr${industryCounts.size === 1 ? "y" : "ies"}`
            : ""}
          .
        </p>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-zinc-950/60"
            onClick={() => setPreview(null)}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {preview.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  {preview.industry} · {preview.category}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                onClick={() => setPreview(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-video w-full bg-zinc-950">
              <TemplatePreview data={preview.design_data} className="h-full w-full" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {preview.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void toggleFavorite(preview)}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      preview.is_favorited && "fill-current text-rose-600",
                    )}
                  />
                  {preview.is_favorited ? "Favorited" : "Favorite"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    void openUseDialog(preview);
                  }}
                >
                  Use Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {useTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-zinc-950/60"
            onClick={() => {
              if (!using) setUseTarget(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-900">
              Use “{useTarget.name}”
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Add this template as a design slide in a loop.
            </p>

            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/40">
                <input
                  type="radio"
                  name="use-mode"
                  className="mt-1"
                  checked={useMode === "new"}
                  onChange={() => setUseMode("new")}
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">
                    Create New Loop
                  </span>
                  <span className="text-xs text-zinc-500">
                    Creates a loop and adds this template as the first slide.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50/40">
                <input
                  type="radio"
                  name="use-mode"
                  className="mt-1"
                  checked={useMode === "existing"}
                  onChange={() => setUseMode("existing")}
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-900">
                    Add to Existing Loop
                  </span>
                  <span className="text-xs text-zinc-500">
                    Appends the template to one of your loops.
                  </span>
                </span>
              </label>
            </div>

            {useMode === "new" ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Loop name
                  </label>
                  <Input
                    value={newLoopName}
                    onChange={(e) => setNewLoopName(e.target.value)}
                    placeholder={useTarget.name}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Orientation
                  </label>
                  <Select
                    value={newOrientation}
                    onChange={(e) =>
                      setNewOrientation(e.target.value as Orientation)
                    }
                    className="w-full"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Select loop
                </label>
                {loops.length === 0 ? (
                  <p className="rounded-md border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
                    No loops yet. Create a new loop instead.
                  </p>
                ) : (
                  <Select
                    value={selectedLoopId}
                    onChange={(e) => setSelectedLoopId(e.target.value)}
                    className="w-full"
                  >
                    {loops.map((loop) => (
                      <option key={loop.id} value={loop.id}>
                        {loop.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={using}
                onClick={() => setUseTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  using ||
                  (useMode === "existing" && (!selectedLoopId || !loops.length))
                }
                onClick={() => void confirmUse()}
              >
                {using ? "Adding…" : "Continue"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
