"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input, Select } from "@/components/ui";
import {
  SmartContentFields,
  SmartTemplateBanner,
} from "@/components/design-editor/smart-content-panel";
import {
  getBlockDefinition,
  type DesignBlockType,
} from "@/components/design-editor/blocks";
import {
  FONT_FAMILIES,
  MIN_ELEMENT_SIZE,
  type DesignElement,
  type DesignElementProps,
} from "@/lib/design-elements";
import { isSmartTemplate } from "@/lib/smart-templates";
import type { DesignData, LibraryItem } from "@/types/db";
import { cn } from "@/lib/utils";

type PropTab = "content" | "style" | "advanced";

export type ElementPatchOptions = {
  /** When false, updates canvas live without pushing undo history (e.g. typing). */
  history?: boolean;
};

export function DesignEditorProperties({
  tab,
  onTabChange,
  selectedElement,
  layoutLocked,
  designData,
  onSmartFieldChange,
  onPatchElement,
  layerCount,
}: {
  tab: PropTab;
  onTabChange: (tab: PropTab) => void;
  selectedElement: DesignElement | null;
  layoutLocked: boolean;
  designData?: DesignData | null;
  onSmartFieldChange?: (fieldId: string, value: string) => void;
  onPatchElement?: (
    patch: Partial<DesignElement> & { props?: Partial<DesignElementProps> },
    options?: ElementPatchOptions,
  ) => void;
  layerCount?: number;
}) {
  const block = selectedElement
    ? getBlockDefinition(selectedElement.type)
    : null;
  const smart = isSmartTemplate(designData);
  const elementLocked = Boolean(selectedElement?.locked);
  // Layout lock protects structure (move/resize/layers); content/style stay editable.
  const canEditContent = Boolean(
    selectedElement && onPatchElement && !elementLocked,
  );
  const canEditStructure = Boolean(
    selectedElement && onPatchElement && !layoutLocked && !elementLocked,
  );
  const canToggleLock = Boolean(
    selectedElement && onPatchElement && !layoutLocked,
  );

  function patchProps(
    props: Partial<DesignElementProps>,
    options?: ElementPatchOptions,
  ) {
    if (!onPatchElement) return;
    onPatchElement({ props }, options);
  }

  function patchElement(
    patch: Partial<DesignElement>,
    options?: ElementPatchOptions,
  ) {
    if (!onPatchElement) return;
    onPatchElement(patch, options);
  }

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
            <SmartTemplateBanner
              data={designData}
              layoutLocked={layoutLocked}
            />
          </div>
        ) : null}

        {tab === "content" && smart && onSmartFieldChange && !selectedElement ? (
          <SmartContentFields
            data={designData}
            onChangeField={onSmartFieldChange}
          />
        ) : !selectedElement || !block ? (
          <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">No selection</p>
            <p className="mt-1 text-xs text-zinc-500">
              {smart
                ? "Edit Smart Template fields above, or select a canvas element."
                : "Select a block to edit Content, Style, and Advanced settings."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{block.label}</p>
              <p className="text-xs text-zinc-500">{block.description}</p>
              {layoutLocked || elementLocked ? (
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                  {elementLocked
                    ? "Element locked · set Lock to Unlocked in Advanced"
                    : "Layout locked · content editable · unlock to move/resize"}
                </p>
              ) : null}
            </div>

            {tab === "content" ? (
              <ContentFields
                blockType={block.type}
                element={selectedElement}
                disabled={!canEditContent}
                onPropsChange={patchProps}
              />
            ) : null}
            {tab === "style" ? (
              <StyleFields
                element={selectedElement}
                disabled={!canEditContent}
                onPropsChange={patchProps}
              />
            ) : null}
            {tab === "advanced" ? (
              <AdvancedFields
                element={selectedElement}
                disabled={!canEditStructure}
                canToggleLock={canToggleLock}
                layerCount={layerCount ?? 1}
                onPatch={patchElement}
                onPropsChange={patchProps}
              />
            ) : null}

            {smart && tab === "content" && onSmartFieldChange ? (
              <div className="border-t border-zinc-100 pt-3">
                <SmartContentFields
                  data={designData}
                  onChangeField={onSmartFieldChange}
                />
              </div>
            ) : null}
          </div>
        )}

        {tab !== "content" && smart && !selectedElement ? (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-200 px-3 py-6 text-center">
            <p className="text-xs text-zinc-500">
              Select an element to edit {tab} properties. Smart content fields
              stay on the Content tab.
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

function DeviceMediaField({
  kind,
  value,
  disabled,
  onChange,
}: {
  kind: "image" | "video";
  value: string;
  disabled?: boolean;
  onChange: (url: string, options?: ElementPatchOptions) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (kind === "image" && !isImage) {
      toast.error("Please choose an image file");
      return;
    }
    if (kind === "video" && !isVideo) {
      toast.error("Please choose a video file");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);
      const res = await fetch("/api/library", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const item = (json.items as LibraryItem[] | undefined)?.[0];
      const url = item?.public_url;
      if (!url) throw new Error("Upload succeeded but no public URL was returned");

      onChange(url, { history: true });
      toast.success(kind === "video" ? "Video added" : "Image added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Field label={kind === "video" ? "Select device video" : "Select device image"}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={kind === "video" ? "video/*" : "image/*"}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading
              ? "Uploading…"
              : kind === "video"
                ? "Choose video…"
                : "Choose image…"}
          </button>
        </div>
      </Field>

      {value ? (
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
          {kind === "video" ? (
            <div className="flex h-20 items-center justify-center px-2 text-[11px] text-zinc-500">
              Video selected
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-20 w-full object-cover"
            />
          )}
        </div>
      ) : null}

      <Field label={kind === "video" ? "Video URL" : "Image URL"}>
        <Input
          className="h-8 text-xs"
          value={value}
          disabled={disabled || uploading}
          placeholder={
            kind === "video" ? "https://…/clip.mp4" : "https://…/image.jpg"
          }
          onChange={(e) => onChange(e.target.value, { history: false })}
          onBlur={() => onChange(value, { history: true })}
        />
      </Field>
    </div>
  );
}

function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none ring-teal-700/30 placeholder:text-zinc-400 focus:ring-2 disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string, options?: ElementPatchOptions) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, { history: true })}
          className="h-8 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-0.5 disabled:opacity-60"
        />
        <Input
          className="h-8 flex-1 text-xs"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, { history: false })}
          onBlur={() => onChange(value, { history: true })}
        />
      </div>
    </Field>
  );
}

function normalizeHex(value: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [, a, b, c] = value;
    return `#${a}${a}${b}${b}${c}${c}`;
  }
  return "#111827";
}

function NumberField({
  label,
  value,
  disabled,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number, options?: ElementPatchOptions) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        className="h-8 text-xs"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onChange(next, { history: false });
        }}
        onBlur={(e) => {
          let next = Number(e.target.value);
          if (!Number.isFinite(next)) next = value;
          if (min != null) next = Math.max(min, next);
          if (max != null) next = Math.min(max, next);
          onChange(next, { history: true });
        }}
      />
    </Field>
  );
}

function ContentFields({
  blockType,
  element,
  disabled,
  onPropsChange,
}: {
  blockType: DesignBlockType;
  element: DesignElement;
  disabled?: boolean;
  onPropsChange: (
    props: Partial<DesignElementProps>,
    options?: ElementPatchOptions,
  ) => void;
}) {
  const p = element.props;

  if (blockType === "text") {
    return (
      <div className="space-y-3">
        <Field label="Text">
          <TextArea
            rows={3}
            value={p.text ?? ""}
            disabled={disabled}
            placeholder="Enter text…"
            onChange={(e) =>
              onPropsChange({ text: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ text: p.text }, { history: true })}
          />
        </Field>
        <Field label="Font">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.fontFamily ?? "sans"}
            onChange={(e) =>
              onPropsChange({ fontFamily: e.target.value }, { history: true })
            }
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alignment">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.align ?? "left"}
            onChange={(e) =>
              onPropsChange(
                { align: e.target.value as DesignElementProps["align"] },
                { history: true },
              )
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (blockType === "image" || blockType === "logo" || blockType === "video") {
    return (
      <div className="space-y-3">
        <DeviceMediaField
          kind={blockType === "video" ? "video" : "image"}
          value={p.imageUrl ?? ""}
          disabled={disabled}
          onChange={(imageUrl, options) =>
            onPropsChange({ imageUrl }, options)
          }
        />
        <Field label="Alt text">
          <Input
            className="h-8 text-xs"
            value={p.alt ?? ""}
            disabled={disabled}
            placeholder="Describe media"
            onChange={(e) =>
              onPropsChange({ alt: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ alt: p.alt }, { history: true })}
          />
        </Field>
        <Field label="Fit mode">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.fit ?? "cover"}
            onChange={(e) =>
              onPropsChange(
                { fit: e.target.value as DesignElementProps["fit"] },
                { history: true },
              )
            }
          >
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
        {blockType !== "price-badge" ? (
          <Field label="Name">
            <Input
              className="h-8 text-xs"
              value={p.name ?? ""}
              disabled={disabled}
              placeholder="Product name"
              onChange={(e) =>
                onPropsChange({ name: e.target.value }, { history: false })
              }
              onBlur={() => onPropsChange({ name: p.name }, { history: true })}
            />
          </Field>
        ) : null}
        {blockType !== "price-badge" ? (
          <Field label="Description">
            <TextArea
              rows={2}
              value={p.description ?? ""}
              disabled={disabled}
              placeholder="Short description"
              onChange={(e) =>
                onPropsChange(
                  { description: e.target.value },
                  { history: false },
                )
              }
              onBlur={() =>
                onPropsChange({ description: p.description }, { history: true })
              }
            />
          </Field>
        ) : null}
        <Field label="Price">
          <Input
            className="h-8 text-xs"
            value={p.price ?? ""}
            disabled={disabled}
            placeholder="$0.00"
            onChange={(e) =>
              onPropsChange({ price: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ price: p.price }, { history: true })}
          />
        </Field>
        {blockType !== "price-badge" ? (
          <>
            <DeviceMediaField
              kind="image"
              value={p.imageUrl ?? ""}
              disabled={disabled}
              onChange={(imageUrl, options) =>
                onPropsChange({ imageUrl }, options)
              }
            />
            <Field label="Category">
              <Input
                className="h-8 text-xs"
                value={p.category ?? ""}
                disabled={disabled}
                placeholder="Category"
                onChange={(e) =>
                  onPropsChange(
                    { category: e.target.value },
                    { history: false },
                  )
                }
                onBlur={() =>
                  onPropsChange({ category: p.category }, { history: true })
                }
              />
            </Field>
            <Field label="CTA">
              <Input
                className="h-8 text-xs"
                value={p.cta ?? ""}
                disabled={disabled}
                placeholder="Order now"
                onChange={(e) =>
                  onPropsChange({ cta: e.target.value }, { history: false })
                }
                onBlur={() => onPropsChange({ cta: p.cta }, { history: true })}
              />
            </Field>
            <label className="flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={Boolean(p.featured)}
                disabled={disabled}
                onChange={(e) =>
                  onPropsChange(
                    { featured: e.target.checked },
                    { history: true },
                  )
                }
                className="rounded border-zinc-300"
              />
              Featured
            </label>
          </>
        ) : null}
      </div>
    );
  }

  if (blockType === "button") {
    return (
      <div className="space-y-3">
        <Field label="Label">
          <Input
            className="h-8 text-xs"
            value={p.label ?? ""}
            disabled={disabled}
            placeholder="Button label"
            onChange={(e) =>
              onPropsChange({ label: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ label: p.label }, { history: true })}
          />
        </Field>
        <Field label="URL">
          <Input
            className="h-8 text-xs"
            value={p.url ?? ""}
            disabled={disabled}
            placeholder="https://"
            onChange={(e) =>
              onPropsChange({ url: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ url: p.url }, { history: true })}
          />
        </Field>
        <Field label="Action">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.action ?? "link"}
            onChange={(e) =>
              onPropsChange(
                { action: e.target.value as DesignElementProps["action"] },
                { history: true },
              )
            }
          >
            <option value="none">None</option>
            <option value="link">Open URL</option>
            <option value="deep-link">Deep link</option>
          </Select>
        </Field>
      </div>
    );
  }

  if (blockType === "dynamic-data") {
    return (
      <div className="space-y-3">
        <Field label="Data source">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.dataSource ?? "product"}
            onChange={(e) => {
              const dataSource = e.target.value;
              const field = p.field ?? "price";
              onPropsChange(
                {
                  dataSource,
                  text: `{{${dataSource}.${field}}}`,
                },
                { history: true },
              );
            }}
          >
            <option value="product">Product</option>
            <option value="restaurant">Restaurant</option>
          </Select>
        </Field>
        <Field label="Field">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.field ?? "price"}
            onChange={(e) => {
              const field = e.target.value;
              const dataSource = p.dataSource ?? "product";
              onPropsChange(
                {
                  field,
                  text: `{{${dataSource}.${field}}}`,
                },
                { history: true },
              );
            }}
          >
            <option value="name">name</option>
            <option value="price">price</option>
            <option value="description">description</option>
            <option value="image">image</option>
            <option value="logo">logo</option>
          </Select>
        </Field>
        <Field label="Fallback value">
          <Input
            className="h-8 text-xs"
            value={p.fallback ?? ""}
            disabled={disabled}
            placeholder="—"
            onChange={(e) =>
              onPropsChange({ fallback: e.target.value }, { history: false })
            }
            onBlur={() =>
              onPropsChange({ fallback: p.fallback }, { history: true })
            }
          />
        </Field>
      </div>
    );
  }

  if (blockType === "qr-code") {
    return (
      <div className="space-y-3">
        <Field label="Label">
          <Input
            className="h-8 text-xs"
            value={p.label ?? ""}
            disabled={disabled}
            placeholder="QR"
            onChange={(e) =>
              onPropsChange({ label: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ label: p.label }, { history: true })}
          />
        </Field>
        <Field label="URL">
          <Input
            className="h-8 text-xs"
            value={p.url ?? ""}
            disabled={disabled}
            placeholder="https://"
            onChange={(e) =>
              onPropsChange({ url: e.target.value }, { history: false })
            }
            onBlur={() => onPropsChange({ url: p.url }, { history: true })}
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Content">
        <TextArea
          rows={3}
          value={p.text ?? p.label ?? ""}
          disabled={disabled}
          placeholder={`${getBlockDefinition(blockType)?.label ?? "Block"} value`}
          onChange={(e) =>
            onPropsChange({ text: e.target.value }, { history: false })
          }
          onBlur={() =>
            onPropsChange({ text: p.text }, { history: true })
          }
        />
      </Field>
    </div>
  );
}

function StyleFields({
  element,
  disabled,
  onPropsChange,
}: {
  element: DesignElement;
  disabled?: boolean;
  onPropsChange: (
    props: Partial<DesignElementProps>,
    options?: ElementPatchOptions,
  ) => void;
}) {
  const p = element.props;
  const isTextual =
    element.type === "text" ||
    element.type === "button" ||
    element.type === "dynamic-data" ||
    element.type === "menu-card" ||
    element.type === "promotion-card" ||
    element.type === "price-badge" ||
    element.type === "contact" ||
    element.type === "hours" ||
    element.type === "location" ||
    element.type === "social-icons";

  return (
    <div className="space-y-3">
      {isTextual ? (
        <>
          <Field label="Font family">
            <Select
              className="h-8 w-full text-xs"
              disabled={disabled}
              value={p.fontFamily ?? "sans"}
              onChange={(e) =>
                onPropsChange(
                  { fontFamily: e.target.value },
                  { history: true },
                )
              }
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Font size"
              value={p.fontSize ?? 16}
              min={8}
              max={200}
              disabled={disabled}
              onChange={(fontSize, options) =>
                onPropsChange({ fontSize }, options)
              }
            />
            <Field label="Font weight">
              <Select
                className="h-8 w-full text-xs"
                disabled={disabled}
                value={String(p.fontWeight ?? 600)}
                onChange={(e) =>
                  onPropsChange(
                    { fontWeight: Number(e.target.value) },
                    { history: true },
                  )
                }
              >
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra bold</option>
              </Select>
            </Field>
          </div>
          <ColorField
            label="Text color"
            value={p.color ?? "#111827"}
            disabled={disabled}
            onChange={(color, options) => onPropsChange({ color }, options)}
          />
        </>
      ) : null}

      <ColorField
        label="Background"
        value={p.background ?? "#FFFFFF"}
        disabled={disabled}
        onChange={(background, options) =>
          onPropsChange({ background }, options)
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <ColorField
          label="Border color"
          value={p.borderColor ?? "#e4e4e7"}
          disabled={disabled}
          onChange={(borderColor, options) =>
            onPropsChange({ borderColor }, options)
          }
        />
        <NumberField
          label="Border width"
          value={p.borderWidth ?? 0}
          min={0}
          max={24}
          disabled={disabled}
          onChange={(borderWidth, options) =>
            onPropsChange({ borderWidth }, options)
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Radius"
          value={p.borderRadius ?? 0}
          min={0}
          max={999}
          disabled={disabled}
          onChange={(borderRadius, options) =>
            onPropsChange({ borderRadius }, options)
          }
        />
        <Field label="Shadow">
          <Select
            className="h-8 w-full text-xs"
            disabled={disabled}
            value={p.shadow ?? "none"}
            onChange={(e) =>
              onPropsChange(
                { shadow: e.target.value as DesignElementProps["shadow"] },
                { history: true },
              )
            }
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </Select>
        </Field>
      </div>

      <NumberField
        label="Opacity"
        value={p.opacity ?? 100}
        min={0}
        max={100}
        disabled={disabled}
        onChange={(opacity, options) => onPropsChange({ opacity }, options)}
      />

      {isTextual ? (
        <>
          <Field label="Alignment">
            <Select
              className="h-8 w-full text-xs"
              disabled={disabled}
              value={p.align ?? "left"}
              onChange={(e) =>
                onPropsChange(
                  { align: e.target.value as DesignElementProps["align"] },
                  { history: true },
                )
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Line height"
              value={p.lineHeight ?? 1.25}
              min={0.8}
              max={3}
              step={0.05}
              disabled={disabled}
              onChange={(lineHeight, options) =>
                onPropsChange({ lineHeight }, options)
              }
            />
            <NumberField
              label="Letter spacing"
              value={p.letterSpacing ?? 0}
              min={-4}
              max={20}
              step={0.5}
              disabled={disabled}
              onChange={(letterSpacing, options) =>
                onPropsChange({ letterSpacing }, options)
              }
            />
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Padding"
          value={p.padding ?? 0}
          min={0}
          max={80}
          disabled={disabled}
          onChange={(padding, options) => onPropsChange({ padding }, options)}
        />
        <NumberField
          label="Margin"
          value={p.margin ?? 0}
          min={0}
          max={80}
          disabled={disabled}
          onChange={(margin, options) => onPropsChange({ margin }, options)}
        />
      </div>
    </div>
  );
}

function AdvancedFields({
  element,
  disabled,
  canToggleLock,
  layerCount,
  onPatch,
  onPropsChange,
}: {
  element: DesignElement;
  disabled?: boolean;
  canToggleLock?: boolean;
  layerCount: number;
  onPatch: (
    patch: Partial<DesignElement>,
    options?: ElementPatchOptions,
  ) => void;
  onPropsChange: (
    props: Partial<DesignElementProps>,
    options?: ElementPatchOptions,
  ) => void;
}) {
  const p = element.props;
  const maxLayer = Math.max(1, layerCount);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={Math.round(element.x)}
          disabled={disabled}
          onChange={(x, options) => onPatch({ x }, options)}
        />
        <NumberField
          label="Y"
          value={Math.round(element.y)}
          disabled={disabled}
          onChange={(y, options) => onPatch({ y }, options)}
        />
        <NumberField
          label="Width"
          value={Math.round(element.width)}
          min={MIN_ELEMENT_SIZE}
          disabled={disabled}
          onChange={(width, options) => onPatch({ width }, options)}
        />
        <NumberField
          label="Height"
          value={Math.round(element.height)}
          min={MIN_ELEMENT_SIZE}
          disabled={disabled}
          onChange={(height, options) => onPatch({ height }, options)}
        />
      </div>

      <NumberField
        label="Rotation"
        value={Math.round(element.rotation)}
        min={-180}
        max={180}
        disabled={disabled}
        onChange={(rotation, options) => onPatch({ rotation }, options)}
      />

      <NumberField
        label="Layer"
        value={element.zIndex}
        min={0}
        max={Math.max(maxLayer * 2, 50)}
        disabled={disabled}
        onChange={(zIndex, options) => onPatch({ zIndex }, options)}
      />

      <Field label="Visibility">
        <Select
          className="h-8 w-full text-xs"
          disabled={disabled}
          value={element.hidden ? "hidden" : "visible"}
          onChange={(e) =>
            onPatch({ hidden: e.target.value === "hidden" }, { history: true })
          }
        >
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </Select>
      </Field>

      <Field label="Animation">
        <Select
          className="h-8 w-full text-xs"
          disabled={disabled}
          value={p.animation ?? "none"}
          onChange={(e) =>
            onPropsChange(
              {
                animation: e.target
                  .value as DesignElementProps["animation"],
              },
              { history: true },
            )
          }
        >
          <AnimationOptions />
        </Select>
      </Field>

      <Field label="Entrance animation">
        <Select
          className="h-8 w-full text-xs"
          disabled={disabled}
          value={p.entranceAnimation ?? "none"}
          onChange={(e) =>
            onPropsChange(
              {
                entranceAnimation: e.target
                  .value as DesignElementProps["entranceAnimation"],
              },
              { history: true },
            )
          }
        >
          <AnimationOptions />
        </Select>
      </Field>

      <Field label="Exit animation">
        <Select
          className="h-8 w-full text-xs"
          disabled={disabled}
          value={p.exitAnimation ?? "none"}
          onChange={(e) =>
            onPropsChange(
              {
                exitAnimation: e.target
                  .value as DesignElementProps["exitAnimation"],
              },
              { history: true },
            )
          }
        >
          <AnimationOptions />
        </Select>
      </Field>

      <NumberField
        label="Duration (ms)"
        value={p.animationDuration ?? 500}
        min={0}
        max={10000}
        step={50}
        disabled={disabled}
        onChange={(animationDuration, options) =>
          onPropsChange({ animationDuration }, options)
        }
      />

      <Field label="Device behavior">
        <Select
          className="h-8 w-full text-xs"
          disabled={disabled}
          value={p.deviceBehavior ?? "all"}
          onChange={(e) =>
            onPropsChange(
              {
                deviceBehavior: e.target
                  .value as DesignElementProps["deviceBehavior"],
              },
              { history: true },
            )
          }
        >
          <option value="all">All devices</option>
          <option value="landscape">Landscape only</option>
          <option value="portrait">Portrait only</option>
        </Select>
      </Field>

      <Field label="Lock">
        <Select
          className="h-8 w-full text-xs"
          disabled={!canToggleLock}
          value={element.locked ? "locked" : "unlocked"}
          onChange={(e) =>
            onPatch(
              { locked: e.target.value === "locked" },
              { history: true },
            )
          }
        >
          <option value="unlocked">Unlocked</option>
          <option value="locked">Locked</option>
        </Select>
      </Field>
    </div>
  );
}

function AnimationOptions() {
  return (
    <>
      <option value="none">None</option>
      <option value="fade">Fade</option>
      <option value="slide-up">Slide up</option>
      <option value="slide-down">Slide down</option>
      <option value="scale">Scale</option>
    </>
  );
}
