"use client";

import { Lock } from "lucide-react";
import { Input } from "@/components/ui";
import {
  getContentValues,
  getEditableFields,
  isSmartTemplate,
  smartFieldInputType,
  type SmartEditableField,
} from "@/lib/smart-templates";
import type { DesignData } from "@/types/db";
import { cn } from "@/lib/utils";

export function SmartTemplateBanner({
  data,
  className,
}: {
  data: DesignData | null | undefined;
  className?: string;
}) {
  if (!isSmartTemplate(data)) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <Lock className="h-3.5 w-3.5" />
        Smart Template
      </span>
      <span className="text-teal-800/80">Layout protected</span>
      <span className="hidden text-teal-700 sm:inline">·</span>
      <span className="text-teal-800/80">Content editable</span>
      <span className="hidden text-teal-700 sm:inline">·</span>
      <span className="text-teal-800/80">Changes sync automatically</span>
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
          Edit text, prices, image labels, and CTAs. Layout stays locked.
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
