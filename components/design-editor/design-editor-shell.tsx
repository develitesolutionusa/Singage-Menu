"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EyeOff, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { DesignEditorBottomBar } from "@/components/design-editor/design-editor-bottom-bar";
import { DesignEditorCanvas } from "@/components/design-editor/design-editor-canvas";
import { DesignEditorLeftPanel } from "@/components/design-editor/design-editor-left-panel";
import { DesignEditorProperties } from "@/components/design-editor/design-editor-properties";
import { DesignElementView } from "@/components/design-editor/design-element-view";
import {
  DesignEditorToolbar,
  type AutoSaveStatus,
  type EditorWorkspaceMode,
} from "@/components/design-editor/design-editor-toolbar";
import type { DesignBlockType } from "@/components/design-editor/blocks";
import { TemplatePreview } from "@/components/templates/template-preview";
import type { TemplateListItem } from "@/lib/templates";
import { resolveSlideDesign } from "@/lib/loop-slides";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  clamp,
  createElementFromBlock,
  duplicateElement,
  getArtboardSize,
  getElements,
  withElements,
  type DesignElement,
} from "@/lib/design-elements";
import {
  ensureSmartDesign,
  isSmartTemplate,
  setContentField,
} from "@/lib/smart-templates";
import {
  cloneElements,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type DesignHistoryState,
} from "@/lib/design-history";
import type { DesignData, Orientation } from "@/types/db";
import { cn } from "@/lib/utils";
import { SmartTemplateBanner } from "@/components/design-editor/smart-content-panel";

export function DesignEditorShell({
  mode,
  onModeChange,
  slideName,
  onSlideNameChange,
  orientation,
  onOrientationChange,
  designData,
  contentData,
  autoSaveStatus,
  lastSavedAt,
  dirty,
  saving,
  onSave,
  onDesignDataChange,
  slideId,
}: {
  mode: EditorWorkspaceMode;
  onModeChange: (mode: EditorWorkspaceMode) => void;
  slideName: string;
  onSlideNameChange: (value: string) => void;
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  designData: DesignData | null;
  contentData?: DesignData | null;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt?: string | null;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDesignDataChange?: (data: DesignData) => void;
  /** When this changes, editor reloads elements from design data. */
  slideId?: string | null;
}) {
  const resolvedDesign = ensureSmartDesign(
    resolveSlideDesign({
      content_data: contentData,
      design_data: designData,
    }),
    slideName,
  );

  const [history, setHistory] = useState<DesignHistoryState>(() =>
    createHistory({
      elements: getElements(resolvedDesign),
      selectedIds: [],
    }),
  );
  const [propTab, setPropTab] = useState<"content" | "style" | "advanced">(
    "content",
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layoutLocked, setLayoutLocked] = useState(
    () => isSmartTemplate(resolvedDesign) && resolvedDesign.layoutLocked !== false,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clipboard, setClipboard] = useState<DesignElement[]>([]);
  const [loadedSlideId, setLoadedSlideId] = useState<string | null>(null);
  const [workingDesign, setWorkingDesign] = useState<DesignData>(resolvedDesign);

  const elements = history.present.elements;
  const selectedIds = history.present.selectedIds;

  // Reload element state only when the active slide identity changes
  useEffect(() => {
    const id = slideId ?? "__none__";
    if (id === loadedSlideId) return;
    const next = ensureSmartDesign(
      resolveSlideDesign({
        content_data: contentData,
        design_data: designData,
      }),
      slideName,
    );
    setLoadedSlideId(id);
    setWorkingDesign(next);
    setLayoutLocked(isSmartTemplate(next) && next.layoutLocked !== false);
    setHistory(
      createHistory({
        elements: getElements(next),
        selectedIds: [],
      }),
    );
    setPan({ x: 0, y: 0 });
    setPropTab("content");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId]);

  const selectedElements = useMemo(
    () => elements.filter((el) => selectedIds.includes(el.id)),
    [elements, selectedIds],
  );
  const primarySelected = selectedElements[0] ?? null;

  const commit = useCallback(
    (nextElements: DesignElement[], nextSelected = selectedIds) => {
      setHistory((prev) =>
        pushHistory(prev, {
          elements: cloneElements(nextElements),
          selectedIds: nextSelected,
        }),
      );
      const nextData = withElements(workingDesign, nextElements);
      setWorkingDesign(nextData);
      onDesignDataChange?.(nextData);
    },
    [onDesignDataChange, selectedIds, workingDesign],
  );

  const handleSmartFieldChange = useCallback(
    (fieldId: string, value: string) => {
      const nextData = setContentField(workingDesign, fieldId, value);
      const nextElements = getElements(nextData);
      setWorkingDesign(nextData);
      setHistory((prev) =>
        pushHistory(prev, {
          elements: cloneElements(nextElements),
          selectedIds: prev.present.selectedIds,
        }),
      );
      onDesignDataChange?.(nextData);
    },
    [onDesignDataChange, workingDesign],
  );

  const setElementsLive = useCallback(
    (nextElements: DesignElement[]) => {
      setHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          elements: nextElements,
        },
      }));
    },
    [],
  );

  const setSelectedIds = useCallback((ids: string[]) => {
    setHistory((prev) => ({
      ...prev,
      present: { ...prev.present, selectedIds: ids },
    }));
  }, []);

  const handleInteractionEnd = useCallback(() => {
    setHistory((prev) => {
      const pushed = pushHistory(prev, {
        elements: cloneElements(prev.present.elements),
        selectedIds: prev.present.selectedIds,
      });
      const nextData = withElements(workingDesign, pushed.present.elements);
      setWorkingDesign(nextData);
      onDesignDataChange?.(nextData);
      return pushed;
    });
  }, [onDesignDataChange, workingDesign]);

  const deleteSelected = useCallback(() => {
    if (!selectedIds.length || layoutLocked) return;
    const next = elements.filter(
      (el) => !selectedIds.includes(el.id) || el.locked,
    );
    commit(next, []);
  }, [commit, elements, layoutLocked, selectedIds]);

  const duplicateSelected = useCallback(() => {
    if (!selectedIds.length || layoutLocked) return;
    const copies = selectedElements
      .filter((el) => !el.locked)
      .map((el) => duplicateElement(el));
    if (!copies.length) return;
    commit([...elements, ...copies], copies.map((c) => c.id));
  }, [commit, elements, layoutLocked, selectedElements, selectedIds.length]);

  const toggleLockSelected = useCallback(() => {
    if (!selectedIds.length || layoutLocked) return;
    const allLocked = selectedElements.every((el) => el.locked);
    commit(
      elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, locked: !allLocked } : el,
      ),
      selectedIds,
    );
  }, [commit, elements, layoutLocked, selectedElements, selectedIds]);

  const toggleHideSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const allHidden = selectedElements.every((el) => el.hidden);
    commit(
      elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, hidden: !allHidden } : el,
      ),
      selectedIds,
    );
  }, [commit, elements, selectedElements, selectedIds]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      const next = undoHistory(prev);
      if (!next) return prev;
      const nextData = withElements(workingDesign, next.present.elements);
      setWorkingDesign(nextData);
      onDesignDataChange?.(nextData);
      return next;
    });
  }, [onDesignDataChange, workingDesign]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      const next = redoHistory(prev);
      if (!next) return prev;
      const nextData = withElements(workingDesign, next.present.elements);
      setWorkingDesign(nextData);
      onDesignDataChange?.(nextData);
      return next;
    });
  }, [onDesignDataChange, workingDesign]);

  // Custom events from context toolbar
  useEffect(() => {
    const onDup = () => duplicateSelected();
    const onDel = () => deleteSelected();
    const onLock = () => toggleLockSelected();
    const onHide = () => toggleHideSelected();
    document.addEventListener("design-editor:duplicate", onDup);
    document.addEventListener("design-editor:delete", onDel);
    document.addEventListener("design-editor:toggle-lock", onLock);
    document.addEventListener("design-editor:toggle-hide", onHide);
    return () => {
      document.removeEventListener("design-editor:duplicate", onDup);
      document.removeEventListener("design-editor:delete", onDel);
      document.removeEventListener("design-editor:toggle-lock", onLock);
      document.removeEventListener("design-editor:toggle-hide", onHide);
    };
  }, [
    deleteSelected,
    duplicateSelected,
    toggleHideSelected,
    toggleLockSelected,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (!selectedElements.length) return;
        e.preventDefault();
        setClipboard(cloneElements(selectedElements));
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        if (!clipboard.length || layoutLocked) return;
        e.preventDefault();
        const copies = clipboard.map((el) => duplicateElement(el));
        commit([...elements, ...copies], copies.map((c) => c.id));
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        if (!selectedIds.length || layoutLocked) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const artboard = getArtboardSize(orientation);
        commit(
          elements.map((el) => {
            if (!selectedIds.includes(el.id) || el.locked) return el;
            return {
              ...el,
              x: clamp(el.x + dx, 0, artboard.width - el.width),
              y: clamp(el.y + dy, 0, artboard.height - el.height),
            };
          }),
          selectedIds,
        );
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clipboard,
    commit,
    deleteSelected,
    duplicateSelected,
    elements,
    layoutLocked,
    orientation,
    redo,
    selectedElements,
    selectedIds,
    undo,
  ]);

  function handleSelectBlock(type: DesignBlockType) {
    if (layoutLocked) {
      toast.message("Smart Template layout is locked", {
        description:
          "Edit content fields in the right panel. Unlock layout only with permission.",
      });
      return;
    }
    const artboard = getArtboardSize(orientation);
    const maxZ = elements.reduce((m, el) => Math.max(m, el.zIndex), 0);
    const created = createElementFromBlock(
      type,
      { x: artboard.width / 2, y: artboard.height / 2 },
      artboard,
      maxZ + 1,
    );
    commit([...elements, created], [created.id]);
    setPropTab("content");
  }

  function handleSelectTemplate(template: TemplateListItem) {
    toast.message(`“${template.name}”`, {
      description:
        "Use Template from the Template Library to add it as a loop slide.",
    });
  }

  function handlePublish() {
    toast.message("Publish is not wired yet", {
      description: "Publishing connects in a later step of the Design Editor plan.",
    });
  }

  const layers = useMemo(
    () =>
      [...elements]
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((el) => ({
          id: el.id,
          name: el.name,
          blockType: el.type,
          locked: el.locked,
          hidden: el.hidden,
        })),
    [elements],
  );

  const canMutate = selectedElements.some((el) => !el.locked) && !layoutLocked;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[640px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
      <DesignEditorToolbar
        slideName={slideName}
        onSlideNameChange={onSlideNameChange}
        orientation={orientation}
        onOrientationChange={onOrientationChange}
        mode={mode}
        onModeChange={onModeChange}
        autoSaveStatus={autoSaveStatus}
        lastSavedAt={lastSavedAt}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setPreviewOpen(true)}
        onSave={onSave}
        onPublish={handlePublish}
        saving={saving}
        dirty={dirty}
      />

      <div className="flex min-h-0 flex-1">
        <DesignEditorLeftPanel
          selectedBlockType={primarySelected?.type ?? null}
          onSelectBlock={handleSelectBlock}
          onSelectTemplate={handleSelectTemplate}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {isSmartTemplate(workingDesign) ? (
            <div className="border-b border-zinc-200 bg-white px-3 py-2">
              <SmartTemplateBanner data={workingDesign} />
            </div>
          ) : null}
          <DesignEditorCanvas
            orientation={orientation}
            zoom={zoom}
            onZoomChange={setZoom}
            showGrid={showGrid}
            designData={workingDesign}
            elements={elements}
            selectedIds={selectedIds}
            slideName={slideName || "Untitled slide"}
            onSelectIds={(ids) => setSelectedIds(ids)}
            onElementsChange={setElementsLive}
            onInteractionEnd={handleInteractionEnd}
            pan={pan}
            onPanChange={setPan}
            interactionLocked={layoutLocked}
          />

          {layersOpen ? (
            <div className="absolute bottom-3 left-3 z-20 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
                <p className="text-xs font-semibold text-zinc-800">Layers</p>
                <button
                  type="button"
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  onClick={() => setLayersOpen(false)}
                  aria-label="Close layers"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <ul className="max-h-64 space-y-0.5 overflow-y-auto p-2">
                {layers.length === 0 ? (
                  <li className="px-2 py-6 text-center text-xs text-zinc-500">
                    Drop blocks onto the canvas to create layers.
                  </li>
                ) : (
                  layers.map((layer) => (
                    <li key={layer.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-zinc-50",
                          selectedIds.includes(layer.id) &&
                            "bg-blue-50 text-blue-800",
                        )}
                        onClick={() => setSelectedIds([layer.id])}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {layer.name}
                        </span>
                        {layer.locked ? (
                          <Lock className="h-3 w-3 text-zinc-400" />
                        ) : null}
                        {layer.hidden ? (
                          <EyeOff className="h-3 w-3 text-zinc-400" />
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <DesignEditorProperties
          tab={propTab}
          onTabChange={setPropTab}
          selectedBlockType={primarySelected?.type ?? null}
          locked={layoutLocked || Boolean(primarySelected?.locked)}
          designData={workingDesign}
          onSmartFieldChange={handleSmartFieldChange}
        />
      </div>

      <DesignEditorBottomBar
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        locked={layoutLocked}
        onToggleLock={() => {
          if (isSmartTemplate(workingDesign) && layoutLocked) {
            toast.message("Layout stays locked for Smart Templates", {
              description:
                "Managers edit content fields only. Unlock Layout permissions arrive in a later step.",
            });
            return;
          }
          setLayoutLocked((v) => !v);
          toast.message(
            layoutLocked ? "Layout unlocked" : "Layout locked",
            {
              description: layoutLocked
                ? "You can move, resize, and add blocks."
                : "Structural edits are paused. Content editing stays available.",
            },
          );
        }}
        zoom={zoom}
        onZoomIn={() =>
          setZoom((z) => clamp(Number((z + ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))
        }
        onZoomOut={() =>
          setZoom((z) => clamp(Number((z - ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX))
        }
        onFit={() => {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        canMutate={canMutate}
      />

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Preview</p>
                <p className="text-xs text-zinc-400">
                  {slideName || "Untitled slide"} · {orientation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Close Preview
              </button>
            </div>
            <div
              className={cn(
                "mx-auto overflow-hidden bg-black",
                orientation === "portrait"
                  ? "aspect-[9/16] max-h-[75vh] max-w-sm"
                  : "aspect-video max-h-[75vh] w-full",
              )}
            >
              {elements.length > 0 ? (
                <CanvasPreview
                  elements={elements}
                  orientation={orientation}
                  background={workingDesign?.theme?.bg}
                />
              ) : workingDesign ? (
                <TemplatePreview data={workingDesign} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Nothing to preview on this slide yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CanvasPreview({
  elements,
  orientation,
  background,
}: {
  elements: DesignElement[];
  orientation: Orientation;
  background?: string;
}) {
  const artboard = getArtboardSize(orientation);
  const sorted = [...elements]
    .filter((el) => !el.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="relative h-full w-full">
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          width: artboard.width,
          height: artboard.height,
          background: background ?? "#0f172a",
          transform: "translate(-50%, -50%) scale(var(--preview-scale, 0.7))",
        }}
      >
        {sorted.map((el) => (
          <div
            key={el.id}
            className="absolute"
            style={{
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex,
            }}
          >
            <DesignElementViewLazy element={el} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DesignElementViewLazy({ element }: { element: DesignElement }) {
  return <DesignElementView element={element} />;
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
