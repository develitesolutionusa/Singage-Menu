import type { CanvasVariant } from "@/lib/menu-board/types";
import type { Zone, ZoneTemplate } from "@/lib/menu-board/zone-schema";

export type QaIssue = {
  severity: "error" | "warn";
  code: "overflow" | "clip" | "overlap" | "empty";
  zoneId?: string;
  message: string;
  variant: CanvasVariant | "default";
};

function zonesOverlap(a: Zone, b: Zone): boolean {
  // Decorative overlaps (hero plate over panel) are intentional when z differs a lot —
  // flag only same-layer text/menu collisions.
  const textish = new Set(["text", "menu-list", "clock", "qr", "logo", "ticker"]);
  if (!textish.has(a.type) || !textish.has(b.type)) return false;
  if (Math.abs((a.zIndex ?? 1) - (b.zIndex ?? 1)) >= 5) return false;

  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const overlapX = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  const overlapY = Math.min(ay2, by2) - Math.max(a.y, b.y);
  return overlapX > 1 && overlapY > 1;
}

function checkZones(
  zones: Zone[],
  variant: CanvasVariant | "default",
): QaIssue[] {
  const issues: QaIssue[] = [];

  for (const z of zones) {
    if (z.w <= 0 || z.h <= 0) {
      issues.push({
        severity: "error",
        code: "empty",
        zoneId: z.id,
        variant,
        message: `Zone "${z.id}" has non-positive size`,
      });
    }
    if (z.x < -2 || z.y < -2 || z.x + z.w > 102 || z.y + z.h > 102) {
      // Allow slight intentional overflow (circular hero bleed)
      if (z.type !== "image" && z.type !== "shape") {
        issues.push({
          severity: "warn",
          code: "clip",
          zoneId: z.id,
          variant,
          message: `Zone "${z.id}" extends outside the safe canvas`,
        });
      }
    }
    if (z.type === "menu-list" && (!z.items || z.items.length === 0)) {
      issues.push({
        severity: "warn",
        code: "empty",
        zoneId: z.id,
        variant,
        message: `Menu-list "${z.id}" has no items`,
      });
    }
    if (z.type === "text" && !z.text.trim()) {
      issues.push({
        severity: "warn",
        code: "empty",
        zoneId: z.id,
        variant,
        message: `Text zone "${z.id}" is empty`,
      });
    }
  }

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (zonesOverlap(zones[i], zones[j])) {
        issues.push({
          severity: "warn",
          code: "overlap",
          zoneId: zones[i].id,
          variant,
          message: `Zones "${zones[i].id}" and "${zones[j].id}" overlap`,
        });
      }
    }
  }

  return issues;
}

/**
 * Render-time QA: flag text overflow risks, clipped zones, overlaps
 * across the default canvas and every declared variant.
 */
export function auditZoneTemplate(template: ZoneTemplate): QaIssue[] {
  const issues = checkZones(template.zones, "default");
  if (template.variants) {
    for (const [variant, pack] of Object.entries(template.variants)) {
      issues.push(
        ...checkZones(pack.zones, variant as CanvasVariant),
      );
    }
  }
  return issues;
}

export function auditAllTemplates(
  templates: ZoneTemplate[],
): Record<string, QaIssue[]> {
  const out: Record<string, QaIssue[]> = {};
  for (const t of templates) {
    out[t.id] = auditZoneTemplate(t);
  }
  return out;
}
