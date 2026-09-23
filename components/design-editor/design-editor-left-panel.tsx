"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Star } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TEMPLATE_INDUSTRIES, type TemplateListItem } from "@/lib/templates";
import { cn } from "@/lib/utils";
import {
  DESIGN_BLOCKS,
  type DesignBlockType,
} from "@/components/design-editor/blocks";
import { BLOCK_DRAG_MIME } from "@/lib/design-elements";

type LeftTab = "templates" | "blocks";

export function DesignEditorLeftPanel({
  selectedBlockType,
  onSelectBlock,
  onSelectTemplate,
}: {
  selectedBlockType: DesignBlockType | null;
  onSelectBlock: (type: DesignBlockType) => void;
  onSelectTemplate?: (template: TemplateListItem) => void;
}) {
  const [tab, setTab] = useState<LeftTab>("templates");
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("");
  const [category, setCategory] = useState("");
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockQuery, setBlockQuery] = useState("");

  useEffect(() => {
    if (tab !== "templates") return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams();
          if (q.trim()) params.set("q", q.trim());
          if (industry) params.set("industry", industry);
          if (category) params.set("category", category);
          const res = await fetch(`/api/templates?${params.toString()}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Failed to load templates");
          setTemplates(json.templates ?? []);
          setCategories(json.categories ?? []);
        } catch {
          setTemplates([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 180);
    return () => window.clearTimeout(handle);
  }, [tab, q, industry, category]);

  useEffect(() => {
    setCategory("");
  }, [industry]);

  const popular = useMemo(() => templates.slice(0, 4), [templates]);
  const recent = useMemo(
    () => templates.filter((t) => t.is_favorited).slice(0, 4),
    [templates],
  );

  const filteredBlocks = useMemo(() => {
    const needle = blockQuery.trim().toLowerCase();
    if (!needle) return DESIGN_BLOCKS;
    return DESIGN_BLOCKS.filter(
      (b) =>
        b.label.toLowerCase().includes(needle) ||
        b.description.toLowerCase().includes(needle),
    );
  }, [blockQuery]);

  return (
    <aside className="flex h-full min-h-0 w-[280px] shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-2">
        <div className="inline-flex w-full rounded-lg bg-zinc-100 p-0.5">
          <button
            type="button"
            onClick={() => setTab("templates")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              tab === "templates"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            Templates
          </button>
          <button
            type="button"
            onClick={() => setTab("blocks")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition",
              tab === "blocks"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            Blocks
          </button>
        </div>
      </div>

      {tab === "templates" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-2 border-b border-zinc-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-8 w-full text-xs"
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
              className="h-8 w-full text-xs"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {recent.length > 0 ? (
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Star className="h-3 w-3" />
                  Recently Used
                </p>
                <TemplateThumbGrid
                  items={recent}
                  onSelect={onSelectTemplate}
                />
              </section>
            ) : null}

            <section>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <Sparkles className="h-3 w-3" />
                Popular Templates
              </p>
              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-video animate-pulse rounded-md bg-zinc-100"
                    />
                  ))}
                </div>
              ) : popular.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-200 px-3 py-6 text-center text-xs text-zinc-500">
                  No templates match these filters.
                </p>
              ) : (
                <TemplateThumbGrid
                  items={popular}
                  onSelect={onSelectTemplate}
                />
              )}
            </section>

            {!loading && templates.length > popular.length ? (
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  All Templates
                </p>
                <TemplateThumbGrid
                  items={templates}
                  onSelect={onSelectTemplate}
                />
              </section>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-zinc-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={blockQuery}
                onChange={(e) => setBlockQuery(e.target.value)}
                placeholder="Search blocks…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {filteredBlocks.map((block) => {
              const Icon = block.icon;
              const active = selectedBlockType === block.type;
              return (
                <button
                  key={block.type}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(BLOCK_DRAG_MIME, block.type);
                    e.dataTransfer.setData("text/plain", block.type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onSelectBlock(block.type)}
                  className={cn(
                    "flex w-full cursor-grab items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition active:cursor-grabbing",
                    active
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-transparent hover:border-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-600",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-zinc-900">
                      {block.label}
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      {block.description}
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredBlocks.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-zinc-500">
                No blocks match your search.
              </p>
            ) : null}
          </div>
          <p className="border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-400">
            Drag a block onto the canvas, or click to place it in the center.
          </p>
        </div>
      )}
    </aside>
  );
}

function TemplateThumbGrid({
  items,
  onSelect,
}: {
  items: TemplateListItem[];
  onSelect?: (template: TemplateListItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect?.(template)}
          className="group overflow-hidden rounded-lg border border-zinc-200 text-left transition hover:border-blue-400 hover:shadow-sm"
          title={template.name}
        >
          <div className="aspect-video bg-zinc-100">
            <TemplatePreview
              data={template.design_data}
              compact
              className="h-full w-full"
            />
          </div>
          <div className="space-y-0.5 p-1.5">
            <p className="truncate text-[11px] font-medium text-zinc-800 group-hover:text-blue-700">
              {template.name}
            </p>
            <p className="truncate text-[10px] text-zinc-500">
              {template.category}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
