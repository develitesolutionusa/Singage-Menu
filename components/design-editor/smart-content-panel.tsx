"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui";
import {
  getContentValues,
  getEditableFields,
  isSmartTemplate,
  smartFieldInputType,
  type SmartEditableField,
  type SmartFieldKind,
} from "@/lib/smart-templates";
import type { DesignData, LibraryItem } from "@/types/db";
import { cn } from "@/lib/utils";

export function SmartTemplateBanner({
  data,
  layoutLocked,
  className,
}: {
  data: DesignData | null | undefined;
  layoutLocked?: boolean;
  className?: string;
}) {
  if (!isSmartTemplate(data)) return null;

  const locked = layoutLocked ?? data.layoutLocked === true;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs",
        locked
          ? "border-teal-200 bg-teal-50 text-teal-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-800",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        {locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
        Smart Template
      </span>
      <span className={locked ? "text-teal-800/80" : "text-zinc-600"}>
        {locked ? "Layout locked" : "Layout unlocked"}
      </span>
      <span className="hidden sm:inline opacity-50">·</span>
      <span className={locked ? "text-teal-800/80" : "text-zinc-600"}>
        {locked
          ? "Unlock anytime from the bottom bar"
          : "All fields editable · lock anytime"}
      </span>
    </div>
  );
}

export function SmartContentFields({
  data,
  onChangeField,
  disabled,
}: {
  data: DesignData | null | undefined;
  onChangeField: (fieldId: string, value: string) => void;
  disabled?: boolean;
}) {
  const fields = getEditableFields(data);
  const values = getContentValues(data);

  if (!fields.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-8 text-center">
        <p className="text-sm font-medium text-zinc-700">No smart fields</p>
        <p className="mt-1 text-xs text-zinc-500">
          This slide is not a Smart Template. Add a restaurant template from the
          Template Library.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Manager content</p>
        <p className="text-xs text-zinc-500">
          Edit text, prices, image labels, and CTAs.
        </p>
      </div>
      {fields.map((field) => (
        <SmartFieldInput
          key={field.id}
          field={field}
          value={values[field.id] ?? field.defaultValue}
          disabled={disabled}
          onChange={(value) => onChangeField(field.id, value)}
        />
      ))}
    </div>
  );
}

function isImageKind(kind: SmartFieldKind) {
  return kind === "image" || kind === "logo";
}

function SmartFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: SmartEditableField;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputType = smartFieldInputType(field.kind);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
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
      onChange(url);
      toast.success("Image added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (isImageKind(field.kind)) {
    return (
      <div className="space-y-2">
        <span className="flex items-center justify-between text-[11px] font-medium text-zinc-600">
          <span>{field.label}</span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            {field.kind}
          </span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ImagePlus className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading…" : "Select device image"}
        </button>
        {value && value.startsWith("http") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-16 w-full rounded-md border border-zinc-200 object-cover"
          />
        ) : null}
        <Input
          value={value}
          disabled={disabled || uploading}
          placeholder={field.placeholder ?? "Image URL"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      </div>
    );
  }

  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between text-[11px] font-medium text-zinc-600">
        <span>{field.label}</span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
          {field.kind}
        </span>
      </span>
      {inputType === "textarea" ? (
        <textarea
          value={value}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none ring-teal-700/30 placeholder:text-zinc-400 focus:ring-2 disabled:opacity-60"
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          placeholder={field.placeholder ?? field.label}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </label>
  );
}
