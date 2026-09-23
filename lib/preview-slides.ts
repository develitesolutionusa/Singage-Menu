import { resolveSlideDesign } from "@/lib/loop-slides";
import type { PlaybackSlideInput } from "@/components/player/playback-slide";
import type { DesignPreviewSlide } from "@/components/design-editor/design-preview-mode";
import type { DesignData, LoopItem, Orientation } from "@/types/db";

/** Map loop items into the shared preview / player slide format. */
export function loopItemsToPreviewSlides(
  items: LoopItem[],
  fallbackOrientation: Orientation = "landscape",
  override?: {
    slideId?: string | null;
    designData?: DesignData | null;
    orientation?: Orientation;
  },
): DesignPreviewSlide[] {
  return items.map((item) => {
    const orientation =
      (item as LoopItem & { orientation?: Orientation }).orientation ??
      fallbackOrientation;
    const name =
      item.slide_name ||
      item.library_item?.name ||
      (item.item_type === "design" ? "Design slide" : "Media");

    if (override?.slideId && item.id === override.slideId && override.designData) {
      return {
        id: item.id,
        name,
        durationSeconds: Math.max(1, item.duration_seconds || 10),
        slide: {
          kind: "design",
          designData: override.designData,
          orientation: override.orientation ?? orientation,
          name,
        } satisfies PlaybackSlideInput,
      };
    }

    if (item.item_type === "design") {
      const designData = resolveSlideDesign(item);
      return {
        id: item.id,
        name,
        durationSeconds: Math.max(1, item.duration_seconds || 10),
        slide: {
          kind: designData ? "design" : "empty",
          designData,
          orientation,
          name,
        },
      };
    }

    const media = item.library_item;
    const fileType = media?.file_type;
    return {
      id: item.id,
      name,
      durationSeconds: Math.max(1, item.duration_seconds || 10),
      slide: {
        kind:
          fileType === "video"
            ? "video"
            : fileType === "image"
              ? "image"
              : "empty",
        url: media?.public_url ?? null,
        name,
        orientation,
      },
    };
  });
}

export function playbackItemToSlideInput(item: {
  itemType?: "media" | "design";
  fileType: string;
  designData?: DesignData | null;
  url?: string | null;
  name?: string | null;
  orientation?: Orientation;
}): PlaybackSlideInput {
  if (item.itemType === "design" || item.fileType === "design") {
    return {
      kind: item.designData ? "design" : "empty",
      designData: item.designData,
      name: item.name,
      orientation: item.orientation,
    };
  }
  if (item.fileType === "video") {
    return {
      kind: item.url ? "video" : "empty",
      url: item.url,
      name: item.name,
      orientation: item.orientation,
    };
  }
  return {
    kind: item.url ? "image" : "empty",
    url: item.url,
    name: item.name,
    orientation: item.orientation,
  };
}
