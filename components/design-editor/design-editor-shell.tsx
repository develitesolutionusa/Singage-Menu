"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DesignEditorBottomBar } from "@/components/design-editor/design-editor-bottom-bar";
import { DesignEditorCanvas } from "@/components/design-editor/design-editor-canvas";
import { DesignEditorLeftPanel } from "@/components/design-editor/design-editor-left-panel";
import { DesignEditorProperties } from "@/components/design-editor/design-editor-properties";
import { DesignLayersPanel } from "@/components/design-editor/design-layers-panel";
import {
  DesignPreviewMode,
  type DesignPreviewSlide,
} from "@/components/design-editor/design-preview-mode";
import {
  DesignEditorToolbar,
  type AutoSaveStatus,
  type EditorWorkspaceMode,
  type PublishUiStatus,
} from "@/components/design-editor/design-editor-toolbar";
import type { DesignBlockType } from "@/components/design-editor/blocks";
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
  type DesignElementProps,
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
  type DesignHistorySnapshot,
  type DesignHistoryState,
} from "@/lib/design-history";
import type { DesignData, Orientation } from "@/types/db";
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
  publishing = false,
  publishStatus = "draft",
  canPublish = true,
  onSave,
  onPublish,
  onBack,
  onDesignDataChange,
  slideId,
  previewSlides,
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
  publishing?: boolean;
  publishStatus?: PublishUiStatus;
  canPublish?: boolean;
  onSave: () => void;
  onPublish: () => void;
  onBack?: () => void;
  onDesignDataChange?: (data: DesignData) => void;
  /** When this changes, editor reloads elements from design data. */
  slideId?: string | null;
  previewSlides?: DesignPreviewSlide[];
}) {
  const resolvedDesign = ensureSmartDesign(
    resolveSlideDesign({
      content_data: contentData,
      design_data: designData,
    }),
    slideName,
  );

  /** Never call parent setState synchronously from this component's render/updaters. */
  const notifyParent = useCallback(
    (data: DesignData) => {
      if (!onDesignDataChange) return;
      queueMicrotask(() => onDesignDataChange(data));
    },
    [onDesignDataChange],
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
    () => resolvedDesign.layoutLocked === true,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clipboard, setClipboard] = useState<DesignElement[]>([]);
  const [loadedSlideId, setLoadedSlideId] = useState<string | null>(null);
  const [workingDesign, setWorkingDesign] = useState<DesignData>(resolvedDesign);
  const interactionBaselineRef = useRef<DesignHistorySnapshot | null>(null);

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
    setLayoutLocked(next.layoutLocked === true);
    interactionBaselineRef.current = null;
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
      notifyParent(nextData);
    },
    [notifyParent, selectedIds, workingDesign],
  );

  const handleSmartFieldChange = useCallback(
    (fieldId: string, value: string) => {
      const nextData = setContentField(workingDesign, fieldId, value);
      const nextElements = getElements(nextData);
      setWorkingDesign(nextData);
      // Live update without flooding undo history (typing).
      setHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          elements: cloneElements(nextElements),
        },
      }));
      notifyParent(nextData);
    },
    [notifyParent, workingDesign],
  );

  const handlePatchElement = useCallback(
    (
      patch: Partial<DesignElement> & { props?: Partial<DesignElementProps> },
      options?: { history?: boolean },
    ) => {
      const id = selectedIds[0];
      if (!id) return;
      const useHistory = options?.history !== false;

      const nextElements = elements.map((el) => {
        if (el.id !== id) return el;
        const { props: propsPatch, ...rest } = patch;
        return {
          ...el,
          ...rest,
          props: propsPatch ? { ...el.props, ...propsPatch } : el.props,
        };
      });

      if (useHistory) {
        commit(nextElements, selectedIds);
        return;
      }

      setHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          elements: nextElements,
        },
      }));
      const nextData = withElements(workingDesign, nextElements);
      setWorkingDesign(nextData);
      notifyParent(nextData);
    },
    [commit, elements, notifyParent, selectedIds, workingDesign],
  );

  const setElementsLive = useCallback((nextElements: DesignElement[]) => {
    setHistory((prev) => {
      if (!interactionBaselineRef.current) {
        interactionBaselineRef.current = {
          elements: cloneElements(prev.present.elements),
          selectedIds: [...prev.present.selectedIds],
        };
      }
      return {
        ...prev,
        present: {
          ...prev.present,
          elements: nextElements,
        },
      };
    });
  }, []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setHistory((prev) => ({
      ...prev,
      present: { ...prev.present, selectedIds: ids },
    }));
  }, []);

  const handleInteractionEnd = useCallback(() => {
    setHistory((prev) => {
      const baseline = interactionBaselineRef.current;
      interactionBaselineRef.current = null;
      const nextPresent = prev.present;

      let nextState: DesignHistoryState;
      if (baseline) {
        const unchanged =
          JSON.stringify(baseline.elements) ===
          JSON.stringify(nextPresent.elements);
        nextState = unchanged
          ? prev
          : {
              past: [...prev.past, baseline].slice(-80),
              present: nextPresent,
              future: [],
            };
      } else {
        nextState = pushHistory(prev, {
          elements: cloneElements(nextPresent.elements),
          selectedIds: nextPresent.selectedIds,
        });
      }

      queueMicrotask(() => {
        setWorkingDesign((wd) => {
          const nextData = withElements(wd, nextPresent.elements);
          notifyParent(nextData);
          return nextData;
        });
      });

      return nextState;
    });
  }, [notifyParent]);

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
    commit(
      [...elements, ...copies],
      copies.map((c) => c.id),
    );
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
    const next = undoHistory(history);
    if (!next) return;
    setHistory(next);
    const nextData = withElements(workingDesign, next.present.elements);
    setWorkingDesign(nextData);
    notifyParent(nextData);
  }, [history, notifyParent, workingDesign]);

  const redo = useCallback(() => {
    const next = redoHistory(history);
    if (!next) return;
    setHistory(next);
    const nextData = withElements(workingDesign, next.present.elements);
    setWorkingDesign(nextData);
    notifyParent(nextData);
  }, [history, notifyParent, workingDesign]);

  // Custom events from context toolbar
  useEffect(() => {
    const onDup = () => duplicateSelected();
    const onDel = () => deleteSelected();
    const onLock = () => toggleLockSelected();
    const onHide = () => toggleHideSelected();
    const onLayers = () => setLayersOpen(true);
    document.addEventListener("design-editor:duplicate", onDup);
    document.addEventListener("design-editor:delete", onDel);
    document.addEventListener("design-editor:toggle-lock", onLock);
    document.addEventListener("design-editor:toggle-hide", onHide);
    document.addEventListener("design-editor:open-layers", onLayers);
    return () => {
      document.removeEventListener("design-editor:duplicate", onDup);
      document.removeEventListener("design-editor:delete", onDel);
      document.removeEventListener("design-editor:toggle-lock", onLock);
      document.removeEventListener("design-editor:toggle-hide", onHide);
      document.removeEventListener("design-editor:open-layers", onLayers);
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
      if (
        mod &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
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
        commit(
          [...elements, ...copies],
          copies.map((c) => c.id),
        );
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
      toast.message("Layout is locked", {
        description:
          "Unlock layout from the bottom bar to add blocks, or edit Manager content fields.",
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

  const canMutate = selectedElements.some((el) => !el.locked) && !layoutLocked;

  const resolvedPreviewSlides = useMemo((): DesignPreviewSlide[] => {
    if (previewSlides && previewSlides.length > 0) return previewSlides;
    return [
      {
        id: slideId ?? "current",
        name: slideName || "Untitled slide",
        durationSeconds: 10,
        slide: {
          kind: "design",
          designData: withElements(workingDesign, elements),
          orientation,
          name: slideName,
        },
      },
    ];
  }, [
    elements,
    orientation,
    previewSlides,
    slideId,
    slideName,
    workingDesign,
  ]);

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
        publishStatus={publishStatus}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setPreviewOpen(true)}
        onSave={onSave}
        onPublish={onPublish}
        onBack={onBack}
        canPublish={canPublish}
        saving={saving}
        publishing={publishing}
        dirty={dirty}
      />

      <div className="flex min-h-0 flex-1">
        <DesignEditorLeftPanel
          selectedBlockType={primarySelected?.type ?? null}
          onSelectBlock={handleSelectBlock}
          onSelectTemplate={handleSelectTemplate}
          layoutLocked={layoutLocked}
          canAddBlocks={!layoutLocked}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {isSmartTemplate(workingDesign) ? (
            <div className="border-b border-zinc-200 bg-white px-3 py-2">
              <SmartTemplateBanner
                data={workingDesign}
                layoutLocked={layoutLocked}
              />
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

          <DesignLayersPanel
            open={layersOpen}
            onClose={() => setLayersOpen(false)}
            elements={elements}
            selectedIds={selectedIds}
            layoutLocked={layoutLocked}
            onSelectIds={setSelectedIds}
            onCommitElements={(next) => commit(next, selectedIds)}
          />
        </div>

        <DesignEditorProperties
          tab={propTab}
          onTabChange={setPropTab}
          selectedElement={primarySelected}
          layoutLocked={layoutLocked}
          designData={workingDesign}
          onSmartFieldChange={handleSmartFieldChange}
          onPatchElement={handlePatchElement}
          layerCount={elements.length}
        />
      </div>

      <DesignEditorBottomBar
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        locked={layoutLocked}
        onToggleLock={() => {
          const nextLocked = !layoutLocked;
          setLayoutLocked(nextLocked);

          const nextElements = nextLocked
            ? elements
            : elements.map((el) => ({ ...el, locked: false }));

          if (!nextLocked) {
            setHistory((prev) =>
              pushHistory(prev, {
                elements: cloneElements(nextElements),
                selectedIds: prev.present.selectedIds,
              }),
            );
          }

          const nextData: DesignData = {
            ...withElements(workingDesign, nextElements),
            layoutLocked: nextLocked,
          };
          setWorkingDesign(nextData);
          notifyParent(nextData);

          toast.success(nextLocked ? "Layout locked" : "Layout unlocked", {
            description: nextLocked
              ? "Structure is protected. Toggle Unlock anytime to edit freely."
              : "You can edit fields, move, resize, and add blocks.",
          });
        }}
        zoom={zoom}
        onZoomIn={() =>
          setZoom((z) =>
            clamp(Number((z + ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX),
          )
        }
        onZoomOut={() =>
          setZoom((z) =>
            clamp(Number((z - ZOOM_STEP).toFixed(2)), ZOOM_MIN, ZOOM_MAX),
          )
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

      <DesignPreviewMode
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        slides={resolvedPreviewSlides}
        initialSlideId={slideId}
        defaultOrientation={orientation}
        title={slideName || "Preview"}
      />
    </div>
  );
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
