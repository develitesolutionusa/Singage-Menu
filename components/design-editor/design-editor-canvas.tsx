"use client";

import { useEffect, useRef, useState } from "react";
import { DesignContextToolbar } from "@/components/design-editor/design-context-toolbar";
import { DesignElementView } from "@/components/design-editor/design-element-view";
import { TemplatePreview } from "@/components/templates/template-preview";
import {
  BLOCK_DRAG_MIME,
  GRID_SIZE,
  MIN_ELEMENT_SIZE,
  type AlignGuide,
  type DesignElement,
  clamp,
  computeAlignGuides,
  constrainElement,
  createElementFromBlock,
  getArtboardSize,
  isDesignBlockType,
  selectionBounds,
  snapWithThreshold,
} from "@/lib/design-elements";
import {
  buildDynamicContext,
  type OrgProfile,
} from "@/lib/dynamic-data";
import { cn } from "@/lib/utils";
import type { DesignData, Orientation } from "@/types/db";

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

type DragSession =
  | {
      kind: "move";
      startX: number;
      startY: number;
      origins: Record<string, { x: number; y: number }>;
      pointerId: number;
    }
  | {
      kind: "resize";
      handle: ResizeHandle;
      startX: number;
      startY: number;
      origin: DesignElement;
      pointerId: number;
    }
  | {
      kind: "pan";
      startX: number;
      startY: number;
      originPanX: number;
      originPanY: number;
      pointerId: number;
    }
  | null;

export function DesignEditorCanvas({
  orientation,
  zoom,
  onZoomChange,
  showGrid,
  designData,
  elements,
  selectedIds,
  slideName,
  onSelectIds,
  onElementsChange,
  onInteractionEnd,
  pan,
  onPanChange,
  interactionLocked = false,
  orgProfile = null,
}: {
  orientation: Orientation;
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  showGrid: boolean;
  designData: DesignData | null;
  elements: DesignElement[];
  selectedIds: string[];
  slideName: string;
  onSelectIds: (ids: string[], additive?: boolean) => void;
  onElementsChange: (elements: DesignElement[]) => void;
  onInteractionEnd: () => void;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  /** When true, block move/resize/drop (Smart Template layout lock). */
  interactionLocked?: boolean;
  orgProfile?: OrgProfile | null;
}) {
  const artboard = getArtboardSize(orientation);
  const dataContext = buildDynamicContext(designData, orgProfile);
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<AlignGuide[]>([]);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const dragRef = useRef<DragSession>(null);
  const [dropActive, setDropActive] = useState(false);

  const selected = elements.filter((el) => selectedIds.includes(el.id));
  const bounds = selectionBounds(selected.filter((el) => !el.hidden));
  const hasLegacyPreview =
    elements.length === 0 &&
    Boolean(
      designData &&
        (designData.headline ||
          designData.layout ||
          designData.sections?.length ||
          designData.items?.length),
    );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function clientToArtboard(clientX: number, clientY: number) {
    const rect = artboardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  }

  function updateElements(
    updater: (prev: DesignElement[]) => DesignElement[],
  ) {
    onElementsChange(updater(elements));
  }

  function handleArtboardPointerDown(e: React.PointerEvent) {
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        originPanX: pan.x,
        originPanY: pan.y,
        pointerId: e.pointerId,
      };
      return;
    }

    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.artboard === "bg") {
      if (!e.shiftKey) onSelectIds([]);
    }
  }

  function handleElementPointerDown(
    e: React.PointerEvent,
    element: DesignElement,
  ) {
    if (spaceHeld || e.button === 1) return;
    e.stopPropagation();
    e.preventDefault();

    onSelectIds(
      e.shiftKey
        ? selectedIds.includes(element.id)
          ? selectedIds.filter((id) => id !== element.id)
          : [...selectedIds, element.id]
        : [element.id],
      e.shiftKey,
    );

    if (interactionLocked || element.locked) {
      return;
    }

    let nextSelected = selectedIds;
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(element.id)
        ? selectedIds.filter((id) => id !== element.id)
        : [...selectedIds, element.id];
    } else if (!selectedIds.includes(element.id)) {
      nextSelected = [element.id];
    }

    const movingIds = nextSelected.includes(element.id)
      ? nextSelected
      : [element.id];
    const origins: Record<string, { x: number; y: number }> = {};
    for (const el of elements) {
      if (movingIds.includes(el.id)) {
        origins[el.id] = { x: el.x, y: el.y };
      }
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      origins,
      pointerId: e.pointerId,
    };
  }

  function handleResizePointerDown(
    e: React.PointerEvent,
    handle: ResizeHandle,
  ) {
    e.stopPropagation();
    e.preventDefault();
    if (interactionLocked) return;
    if (selected.length !== 1 || selected[0].locked) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origin: { ...selected[0] },
      pointerId: e.pointerId,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    if (session.kind === "pan") {
      onPanChange({
        x: session.originPanX + (e.clientX - session.startX),
        y: session.originPanY + (e.clientY - session.startY),
      });
      return;
    }

    const dx = (e.clientX - session.startX) / zoom;
    const dy = (e.clientY - session.startY) / zoom;

    if (session.kind === "move") {
      const moving = elements.filter((el) => session.origins[el.id]);
      const draft = moving.map((el) => ({
        ...el,
        x: session.origins[el.id].x + dx,
        y: session.origins[el.id].y + dy,
      }));
      const others = elements.filter((el) => !session.origins[el.id]);
      const align = computeAlignGuides(draft, others, artboard);
      setGuides(align.guides);

      updateElements((prev) =>
        prev.map((el) => {
          const origin = session.origins[el.id];
          if (!origin) return el;
          let nextX = origin.x + dx + align.dx;
          let nextY = origin.y + dy + align.dy;
          if (!e.altKey) {
            nextX = snapWithThreshold(nextX);
            nextY = snapWithThreshold(nextY);
          }
          const constrained = constrainElement(
            { ...el, x: nextX, y: nextY },
            artboard,
          );
          return { ...el, ...constrained };
        }),
      );
      return;
    }

    if (session.kind === "resize") {
      const next = resizeFromHandle(session.origin, session.handle, dx, dy);
      const snapped = e.altKey
        ? next
        : {
            ...next,
            x: snapWithThreshold(next.x),
            y: snapWithThreshold(next.y),
            width: Math.max(MIN_ELEMENT_SIZE, snapWithThreshold(next.width)),
            height: Math.max(MIN_ELEMENT_SIZE, snapWithThreshold(next.height)),
          };
      const constrained = constrainElement(snapped, artboard);
      updateElements((prev) =>
        prev.map((el) =>
          el.id === session.origin.id ? { ...el, ...constrained } : el,
        ),
      );
      setGuides([]);
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setGuides([]);
    if (session.kind === "move" || session.kind === "resize") {
      onInteractionEnd();
    }
  }

  function handleWheel(e: React.WheelEvent) {
    if (!(e.ctrlKey || e.metaKey) || !onZoomChange) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    onZoomChange(clamp(Number((zoom + delta).toFixed(2)), 0.35, 2));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    if (interactionLocked) return;
    const raw =
      e.dataTransfer.getData(BLOCK_DRAG_MIME) ||
      e.dataTransfer.getData("text/plain");
    if (!isDesignBlockType(raw)) return;
    const point = clientToArtboard(e.clientX, e.clientY);
    const maxZ = elements.reduce((m, el) => Math.max(m, el.zIndex), 0);
    const created = createElementFromBlock(raw, point, artboard, maxZ + 1);
    const constrained = {
      ...created,
      ...constrainElement(created, artboard),
    };
    onElementsChange([...elements, constrained]);
    onSelectIds([constrained.id]);
    onInteractionEnd();
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-3 py-1.5 text-[11px] text-zinc-500 backdrop-blur">
        <span>
          Canvas · {orientation === "portrait" ? "9:16" : "16:9"} ·{" "}
          {Math.round(zoom * 100)}%
          {spaceHeld ? " · Pan" : ""}
        </span>
        <span className="truncate font-medium text-zinc-700">{slideName}</span>
      </div>

      <div
        ref={stageRef}
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6",
          spaceHeld ? "cursor-grab" : "cursor-default",
          dropActive && "bg-blue-50/40",
        )}
        onWheel={handleWheel}
        onDragOver={(e) => {
          e.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleDrop}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          className="relative"
        >
          <div
            ref={artboardRef}
            role="presentation"
            data-artboard="bg"
            className={cn(
              "relative overflow-hidden rounded-xl border bg-white shadow-[0_20px_50px_-24px_rgba(15,23,42,0.35)]",
              dropActive ? "border-blue-500 ring-2 ring-blue-400/40" : "border-zinc-300",
            )}
            style={{
              width: artboard.width,
              height: artboard.height,
              backgroundImage: showGrid
                ? "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)"
                : undefined,
              backgroundSize: showGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : undefined,
              backgroundColor: designData?.theme?.bg ?? "#f8fafc",
            }}
            onPointerDown={handleArtboardPointerDown}
          >
            {hasLegacyPreview && designData ? (
              <div className="pointer-events-none absolute inset-0 opacity-90">
                <TemplatePreview
                  data={designData}
                  className="h-full w-full"
                  orgProfile={orgProfile}
                />
              </div>
            ) : null}

            {sorted.length === 0 && !hasLegacyPreview ? (
              <div className="pointer-events-none flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                <p className="text-sm font-semibold text-zinc-700">
                  Drop blocks onto the canvas
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                  Drag Text, Image, Menu Card, and other blocks from the left
                  panel. Hold Space to pan · Ctrl/Cmd+scroll to zoom.
                </p>
              </div>
            ) : null}

            {sorted.map((element) => {
              if (element.hidden) return null;
              const isSelected = selectedIds.includes(element.id);
              return (
                <div
                  key={element.id}
                  className={cn(
                    "absolute touch-none",
                    element.locked ? "cursor-default" : "cursor-move",
                    isSelected && "z-20",
                  )}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    transform: element.rotation
                      ? `rotate(${element.rotation}deg)`
                      : undefined,
                    zIndex: element.zIndex,
                  }}
                  onPointerDown={(e) => handleElementPointerDown(e, element)}
                >
                  <div
                    className={cn(
                      "h-full w-full",
                      isSelected &&
                        "outline outline-2 outline-blue-500 outline-offset-0",
                    )}
                  >
                    <DesignElementView
                      element={element}
                      selected={isSelected}
                      dataContext={dataContext}
                      showDynamicBadge
                    />
                  </div>
                </div>
              );
            })}

            {guides.map((guide, index) => (
              <div
                key={`${guide.orientation}-${guide.position}-${index}`}
                className="pointer-events-none absolute z-40 bg-fuchsia-500"
                style={
                  guide.orientation === "v"
                    ? {
                        left: guide.position,
                        top: 0,
                        width: 1,
                        height: artboard.height,
                      }
                    : {
                        top: guide.position,
                        left: 0,
                        height: 1,
                        width: artboard.width,
                      }
                }
              />
            ))}

            {bounds && selected.length > 0 ? (
              <>
                <DesignContextToolbar
                  x={bounds.x + bounds.width / 2}
                  y={bounds.y}
                  locked={selected.every((el) => el.locked)}
                  hidden={selected.every((el) => el.hidden)}
                  onDuplicate={() => {
                    /* parent handles via keyboard/bottom bar */
                    document.dispatchEvent(
                      new CustomEvent("design-editor:duplicate"),
                    );
                  }}
                  onDelete={() => {
                    document.dispatchEvent(
                      new CustomEvent("design-editor:delete"),
                    );
                  }}
                  onToggleLock={() => {
                    document.dispatchEvent(
                      new CustomEvent("design-editor:toggle-lock"),
                    );
                  }}
                  onToggleHide={() => {
                    document.dispatchEvent(
                      new CustomEvent("design-editor:toggle-hide"),
                    );
                  }}
                />
                {selected.length === 1 &&
                !selected[0].locked &&
                !interactionLocked ? (
                  <ResizeHandles
                    bounds={bounds}
                    onPointerDown={handleResizePointerDown}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResizeHandles({
  bounds,
  onPointerDown,
}: {
  bounds: { x: number; y: number; width: number; height: number };
  onPointerDown: (e: React.PointerEvent, handle: ResizeHandle) => void;
}) {
  const handles: Array<{ id: ResizeHandle; style: React.CSSProperties }> = [
    { id: "nw", style: { left: bounds.x - 5, top: bounds.y - 5, cursor: "nwse-resize" } },
    { id: "ne", style: { left: bounds.x + bounds.width - 5, top: bounds.y - 5, cursor: "nesw-resize" } },
    { id: "sw", style: { left: bounds.x - 5, top: bounds.y + bounds.height - 5, cursor: "nesw-resize" } },
    { id: "se", style: { left: bounds.x + bounds.width - 5, top: bounds.y + bounds.height - 5, cursor: "nwse-resize" } },
    { id: "n", style: { left: bounds.x + bounds.width / 2 - 5, top: bounds.y - 5, cursor: "ns-resize" } },
    { id: "s", style: { left: bounds.x + bounds.width / 2 - 5, top: bounds.y + bounds.height - 5, cursor: "ns-resize" } },
    { id: "w", style: { left: bounds.x - 5, top: bounds.y + bounds.height / 2 - 5, cursor: "ew-resize" } },
    { id: "e", style: { left: bounds.x + bounds.width - 5, top: bounds.y + bounds.height / 2 - 5, cursor: "ew-resize" } },
  ];

  return (
    <>
      <div
        className="pointer-events-none absolute z-30 border border-blue-500"
        style={{
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }}
      />
      {handles.map((handle) => (
        <button
          key={handle.id}
          type="button"
          aria-label={`Resize ${handle.id}`}
          className="absolute z-40 h-2.5 w-2.5 rounded-sm border border-blue-600 bg-white shadow-sm"
          style={handle.style}
          onPointerDown={(e) => onPointerDown(e, handle.id)}
        />
      ))}
    </>
  );
}

function resizeFromHandle(
  origin: DesignElement,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Pick<DesignElement, "x" | "y" | "width" | "height"> {
  let { x, y, width, height } = origin;

  if (handle.includes("e")) width = origin.width + dx;
  if (handle.includes("s")) height = origin.height + dy;
  if (handle.includes("w")) {
    width = origin.width - dx;
    x = origin.x + dx;
  }
  if (handle.includes("n")) {
    height = origin.height - dy;
    y = origin.y + dy;
  }

  if (width < MIN_ELEMENT_SIZE) {
    if (handle.includes("w")) x = origin.x + origin.width - MIN_ELEMENT_SIZE;
    width = MIN_ELEMENT_SIZE;
  }
  if (height < MIN_ELEMENT_SIZE) {
    if (handle.includes("n")) y = origin.y + origin.height - MIN_ELEMENT_SIZE;
    height = MIN_ELEMENT_SIZE;
  }

  return { x, y, width, height };
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
