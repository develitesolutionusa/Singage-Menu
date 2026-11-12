import type { DesignData, Orientation, TemplateIndustry } from "@/types/db";

/** Product currently ships Restaurant & Food templates only. */
export const DEFAULT_TEMPLATE_INDUSTRY: TemplateIndustry = "Restaurant & Food";

export const TEMPLATE_INDUSTRIES: TemplateIndustry[] = [
  DEFAULT_TEMPLATE_INDUSTRY,
];

export type TemplateListItem = {
  id: string;
  name: string;
  industry: TemplateIndustry;
  category: string;
  tags: string[];
  orientation: Orientation;
  default_duration_seconds: number;
  design_data: DesignData;
  sort_order: number;
  is_favorited: boolean;
};

export function isDesignData(value: unknown): value is DesignData {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
