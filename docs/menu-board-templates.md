# Digital Menu Board — Zone Templates

Data-driven templates for TV / kiosk signage. Design once on a fixed canvas; `ScreenStage` scale-to-fits any viewport (1080p, 4K, 720p, Fire Stick, Pi Chromium, portrait kiosks).

## Core pieces

| Piece | Path |
|---|---|
| `ScreenStage` | `components/menu-board/screen-stage.tsx` |
| `useAspectRatio` | `lib/menu-board/use-aspect-ratio.ts` |
| Zone schema (zod) | `lib/menu-board/zone-schema.ts` |
| `ZoneRenderer` | `components/menu-board/zone-renderer.tsx` |
| `ZoneEngine` | `components/menu-board/zone-engine.tsx` |
| Preview toolbar | `components/menu-board/preview-toolbar.tsx` |
| QA audit | `lib/menu-board/qa.ts` |
| Example templates | `lib/menu-board/templates/` |

## Zone schema

Each zone:

```ts
{
  id: string
  type: "image" | "video" | "menu-list" | "text" | "clock" | "qr" | "ticker" | "logo" | "shape"
  x, y, w, h  // percent of canvas (never hard-code screen pixels)
  zIndex: number
  style?: { background, color, objectFit, borderRadius, ... }
  // + type-specific fields (src, text, items, …)
}
```

`menu-list` supports dotted leader lines, veg/spicy/new badges, and overflow modes: `shrink` | `scroll` | `paginate`.

## Example templates

1. **seasonal-menu** — landscape hero + white menu panel + orange ticker (Pincher’s / Summer Flavours style)
2. **promo-ticker** — full-bleed promo + specials ticker
3. **portrait-wall-3** (screen group) — linked Starters / Mains / Specials on a 3×1 portrait wall

Preview: `/menu-board`

## Screen groups (video wall)

```ts
{
  id: "portrait-wall-3",
  columns: 3,
  rows: 1,
  mode: "linked" | "span",
  bezelGapPercent: 1.2,
  screenTemplateIds: ["wall-starters", "wall-mains", "wall-desserts"]
}
```

- **linked** — each screen plays its own template (synced transition timing left to the player loop).
- **span** — one wide template; each device renders a bezel-aware clip slice.

Device URL:

```
/player/[screenId]?group=portrait-wall-3&index=0
```

`index` is 0-based left→right (then top→bottom).

## Design Editor integration

Zone boards are also **Smart Templates** in the Template Library / Design Editor:

1. Converted via `zoneTemplateToDesignData()` → editable canvas elements + Manager content fields.
2. Registered in `buildZoneBoardCatalog()` → `buildRestaurantSmartTemplates()`.
3. Seeded to Supabase with `npx tsx scripts/upgrade-smart-templates.ts`.
4. Player / Preview Mode uses `ZoneBoardStage` (TV-faithful renderer) when `design_data.zoneBoard === true`.

**In the editor:** Templates → pick “Seasonal Menu Board”, “Promo Ticker Board”, or a Wall board → edit items/prices in Manager content (or unlock layout to drag). Preview / Publish plays the zone renderer.

## How to add a new template

1. Create `lib/menu-board/templates/my-template.ts` exporting a `ZoneTemplate`.
2. Register it in `lib/menu-board/templates/index.ts` (`ZONE_TEMPLATES`).
3. Add a named entry in `lib/menu-board/zone-board-catalog.ts`.
4. Add META in `scripts/upgrade-smart-templates.ts`, then run the seed script.
5. Optionally add a portrait/square/ultrawide pack under `variants`.
6. Run QA: `runTemplateQa()` flags overflow, clip, and overlap issues.
7. Preview at `/menu-board` (add an entry to the demo switcher if desired).

Keep all coordinates in **% of canvas**. Only `canvas.width` / `canvas.height` use design pixels (e.g. 1920×1080); `ScreenStage` handles real TV sizes.

## Device / CSS notes

- Prefer `transform: scale`, `cqw`/`cqh`, and opacity fades — avoid heavy `filter: blur` and large shadows on Pi / Fire Stick.
- Images: WebP/AVIF when available; always set a `fallbackSrc`.
- Videos: `muted` + `autoPlay` + `loop` + `playsInline`.
- Cap decorative motion ~30–60fps; ticker uses a single CSS translate loop.
