"use client";

import { Input, Select } from "@/components/ui";
import {
  SmartContentFields,
  SmartTemplateBanner,
} from "@/components/design-editor/smart-content-panel";
import {
  getBlockDefinition,
  type DesignBlockType,
} from "@/components/design-editor/blocks";
import { isSmartTemplate } from "@/lib/smart-templates";
import type { DesignData } from "@/types/db";
import { cn } from "@/lib/utils";

type PropTab = "content" | "style" | "advanced";

export function DesignEditorProperties({
  tab,
  onTabChange,
  selectedBlockType,
  locked,
  designData,
  onSmartFieldChange,
}: {
  tab: PropTab;
  onTabChange: (tab: PropTab) => void;
  selectedBlockType: DesignBlockType | null;
  locked: boolean;
  designData?: DesignData | null;
  onSmartFieldChange?: (fieldId: string, value: string) => void;
}) {
  const block = selectedBlockType
    ? getBlockDefinition(selectedBlockType)
    : null;
  const smart = isSmartTemplate(designData);

  return (
    <aside className="flex h-full min-h-0 w-[300px] shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-2">
        <div className="inline-flex w-full rounded-lg bg-zinc-100 p-0.5">
          {(["content", "style", "advanced"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTabChange(item)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition",
                tab === item
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {smart ? (
          <div className="mb-3">
            <SmartTemplateBanner data={designData} />
          </div>
        ) : null}

        {tab === "content" && smart && onSmartFieldChange ? (
          <SmartContentFields
            data={designData}
            onChangeField={onSmartFieldChange}
          />
        ) : !block ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No selection</p>
            <p className="mt-1 text-xs text-zinc-500">
              {smart
                ? "Edit Smart Template fields above, or select a canvas element."
                : "Select a block to inspect Content, Style, and Advanced settings."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{block.label}</p>
              <p className="text-xs text-zinc-500">{block.description}</p>
              {locked ? (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  Layout locked · use Smart Template content fields
                </p>
              ) : null}
            </div>

            {tab === "content" ? (
              <ContentFields blockType={block.type} />
            ) : null}
            {tab === "style" ? <StyleFields /> : null}
            {tab === "advanced" ? <AdvancedFields /> : null}

            {smart ? (
              <p className="rounded-md bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-500">
                Prefer Manager content fields for Smart Templates so layout stays
                protected.
              </p>
            ) : (
              <p className="rounded-md bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-500">
                Full property binding lands in the next editor step.
              </p>
            )}
          </div>
        )}

        {tab !== "content" && smart && !block ? (
          <div className="mt-4 space-y-4 opacity-70">
            {tab === "style" ? <StyleFields /> : <AdvancedFields />}
            <p className="text-[11px] text-zinc-500">
              Style and layout geometry stay protected while the Smart Template
              layout is locked.
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

function ContentFields({ blockType }: { blockType: DesignBlockType }) {
  if (blockType === "text" || blockType === "button") {
    return (
      <div className="space-y-3">
        <Field label={blockType === "button" ? "Label" : "Text"}>
          <Input className="h-8 text-xs" placeholder="Enter text…" disabled />
        </Field>
        {blockType === "text" ? (
          <Field label="Alignment">
            <Select className="h-8 w-full text-xs" disabled defaultValue="left">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </Field>
        ) : (
          <Field label="URL / Action">
            <Input className="h-8 text-xs" placeholder="https://" disabled />
          </Field>
        )}
      </div>
    );
  }

  if (blockType === "image" || blockType === "logo" || blockType === "video") {
    return (
      <div className="space-y-3">
        <Field label={blockType === "video" ? "Video" : "Image"}>
          <Buttonish disabled>
            {blockType === "video" ? "Choose video…" : "Choose image…"}
          </Buttonish>
        </Field>
        <Field label="Alt text">
          <Input className="h-8 text-xs" placeholder="Describe media" disabled />
        </Field>
        <Field label="Fit mode">
          <Select className="h-8 w-full text-xs" disabled defaultValue="cover">
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (
    blockType === "menu-card" ||
    blockType === "price-badge" ||
    blockType === "promotion-card"
  ) {
    return (
      <div className="space-y-3">
        <Field label="Name">
          <Input className="h-8 text-xs" placeholder="Product name" disabled />
        </Field>
        <Field label="Description">
          <Input className="h-8 text-xs" placeholder="Short description" disabled />
        </Field>
        <Field label="Price">
          <Input className="h-8 text-xs" placeholder="$0.00" disabled />
        </Field>
        <Field label="Category">
          <Input className="h-8 text-xs" placeholder="Category" disabled />
        </Field>
        <Field label="CTA">
          <Input className="h-8 text-xs" placeholder="Order now" disabled />
        </Field>
      </div>
    );
  }

  if (blockType === "dynamic-data") {
    return (
      <div className="space-y-3">
        <Field label="Data source">
          <Select className="h-8 w-full text-xs" disabled defaultValue="product">
            <option value="product">Product</option>
            <option value="restaurant">Restaurant</option>
          </Select>
        </Field>
        <Field label="Field">
          <Select className="h-8 w-full text-xs" disabled defaultValue="price">
            <option value="name">name</option>
            <option value="price">price</option>
            <option value="description">description</option>
          </Select>
        </Field>
        <Field label="Fallback value">
          <Input className="h-8 text-xs" placeholder="—" disabled />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Content">
        <Input
          className="h-8 text-xs"
          placeholder={`${getBlockDefinition(blockType)?.label ?? "Block"} value`}
          disabled
        />
      </Field>
    </div>
  );
}

function StyleFields() {
  return (
    <div className="space-y-3">
      <Field label="Font family">
        <Select className="h-8 w-full text-xs" disabled defaultValue="sans">
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Font size">
          <Input className="h-8 text-xs" defaultValue="16" disabled />
        </Field>
        <Field label="Font weight">
          <Select className="h-8 w-full text-xs" disabled defaultValue="600">
            <option value="400">Regular</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
          </Select>
        </Field>
      </div>
      <Field label="Text color">
        <Input className="h-8 text-xs" defaultValue="#111827" disabled />
      </Field>
      <Field label="Background">
        <Input className="h-8 text-xs" defaultValue="#FFFFFF" disabled />
      </Field>
    </div>
  );
}

function AdvancedFields() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <Input className="h-8 text-xs" defaultValue="0" disabled />
        </Field>
        <Field label="Y">
          <Input className="h-8 text-xs" defaultValue="0" disabled />
        </Field>
        <Field label="Width">
          <Input className="h-8 text-xs" defaultValue="200" disabled />
        </Field>
        <Field label="Height">
          <Input className="h-8 text-xs" defaultValue="80" disabled />
        </Field>
      </div>
      <Field label="Lock">
        <Select className="h-8 w-full text-xs" disabled defaultValue="locked">
          <option value="locked">Locked</option>
          <option value="unlocked">Unlocked</option>
        </Select>
      </Field>
    </div>
  );
}

function Buttonish({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="h-8 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 text-left text-xs text-zinc-500 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
