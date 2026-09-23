"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BringToFront,
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Pencil,
  SendToBack,
  Unlock,
  X,
} from "lucide-react";
import { getBlockDefinition } from "@/components/design-editor/blocks";
import {
  applyFrontToBackOrder,
  bringForward,
  bringToFront,
  layersFrontToBack,
  renameLayer,
  sendBackward,
  sendToBack,
  setLayerHidden,
  setLayerLocked,
} from "@/lib/design-layers";
import type { DesignElement } from "@/lib/design-elements";
import { cn } from "@/lib/utils";

export function DesignLayersPanel({
  open,
  onClose,
  elements,
  selectedIds,
  layoutLocked,
  onSelectIds,
  onCommitElements,
}: {
  open: boolean;
  onClose: () => void;
  elements: DesignElement[];
  selectedIds: string[];
  layoutLocked: boolean;
  onSelectIds: (ids: string[]) => void;
  onCommitElements: (next: DesignElement[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const ordered = useMemo(() => layersFrontToBack(elements), [elements]);
  const orderedIds = useMemo(() => ordered.map((el) => el.id), [ordered]);
  const primaryId = selectedIds[0] ?? null;
  const primary = primaryId
    ? elements.find((el) => el.id === primaryId) ?? null
    : null;

  const canReorder = !layoutLocked;

  function handleDragEnd(event: DragEndEvent) {
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrder = arrayMove(orderedIds, oldIndex, newIndex);
    onCommitElements(applyFrontToBackOrder(elements, nextOrder));
  }

  if (!open) return null;

  return (
    <div className="absolute bottom-3 left-3 z-20 flex w-80 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-zinc-800">Layers</p>
          <p className="text-[10px] text-zinc-500">
            Front → back · drag to reorder
          </p>
        </div>
        <button
          type="button"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          onClick={onClose}
          aria-label="Close layers"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {primary ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5">
          <LayerAction
            label="Bring forward"
            disabled={layoutLocked}
            onClick={() =>
              onCommitElements(bringForward(elements, primary.id))
            }
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          </LayerAction>
          <LayerAction
            label="Send backward"
            disabled={layoutLocked}
            onClick={() =>
              onCommitElements(sendBackward(elements, primary.id))
            }
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </LayerAction>
          <LayerAction
            label="Bring to front"
            disabled={layoutLocked}
            onClick={() => onCommitElements(bringToFront(elements, primary.id))}
          >
            <BringToFront className="h-3.5 w-3.5" />
          </LayerAction>
          <LayerAction
            label="Send to back"
            disabled={layoutLocked}
            onClick={() => onCommitElements(sendToBack(elements, primary.id))}
          >
            <SendToBack className="h-3.5 w-3.5" />
          </LayerAction>
        </div>
      ) : null}

      <div className="max-h-72 overflow-y-auto p-2">
        {ordered.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-zinc-500">
            Drop blocks onto the canvas to create layers.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedIds}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5">
                {ordered.map((layer) => (
                  <SortableLayerRow
                    key={layer.id}
                    layer={layer}
                    selected={selectedIds.includes(layer.id)}
                    canReorder={canReorder}
                    layoutLocked={layoutLocked}
                    onSelect={(multi) => {
                      if (multi) {
                        onSelectIds(
                          selectedIds.includes(layer.id)
                            ? selectedIds.filter((id) => id !== layer.id)
                            : [...selectedIds, layer.id],
                        );
                      } else {
                        onSelectIds([layer.id]);
                      }
                    }}
                    onRename={(name) =>
                      onCommitElements(renameLayer(elements, layer.id, name))
                    }
                    onToggleHidden={() =>
                      onCommitElements(
                        setLayerHidden(elements, layer.id, !layer.hidden),
                      )
                    }
                    onToggleLocked={() => {
                      if (layoutLocked) return;
                      onCommitElements(
                        setLayerLocked(elements, layer.id, !layer.locked),
                      );
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function LayerAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SortableLayerRow({
  layer,
  selected,
  canReorder,
  layoutLocked,
  onSelect,
  onRename,
  onToggleHidden,
  onToggleLocked,
}: {
  layer: DesignElement;
  selected: boolean;
  canReorder: boolean;
  layoutLocked: boolean;
  onSelect: (multi: boolean) => void;
  onRename: (name: string) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id, disabled: !canReorder });

  const def = getBlockDefinition(layer.type);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function commitRename() {
    setEditing(false);
    if (draft.trim() !== layer.name) onRename(draft);
    else setDraft(layer.name);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1 rounded-md border px-1 py-1 text-xs",
        selected
          ? "border-blue-200 bg-blue-50 text-blue-900"
          : "border-transparent hover:bg-zinc-50",
        isDragging && "z-10 bg-white shadow-md",
        layer.hidden && "opacity-60",
      )}
    >
      <button
        type="button"
        className={cn(
          "cursor-grab touch-none rounded p-1 text-zinc-400 active:cursor-grabbing",
          !canReorder && "cursor-default opacity-30",
        )}
        aria-label="Drag to reorder"
        disabled={!canReorder}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left"
        onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
        onDoubleClick={() => {
          setDraft(layer.name);
          setEditing(true);
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(layer.name);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-6 w-full rounded border border-blue-300 bg-white px-1.5 text-xs text-zinc-900 outline-none"
          />
        ) : (
          <span className="block truncate">
            <span className="font-medium">{layer.name}</span>
            <span className="ml-1 text-[10px] text-zinc-400">
              {def?.label ?? layer.type}
            </span>
          </span>
        )}
      </button>

      <button
        type="button"
        title="Rename"
        aria-label="Rename layer"
        className="rounded p-1 text-zinc-400 opacity-0 hover:bg-zinc-100 hover:text-zinc-700 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(layer.name);
          setEditing(true);
        }}
      >
        <Pencil className="h-3 w-3" />
      </button>

      <button
        type="button"
        title={layer.hidden ? "Show" : "Hide"}
        aria-label={layer.hidden ? "Show layer" : "Hide layer"}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden();
        }}
      >
        {layer.hidden ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>

      <button
        type="button"
        title={layer.locked ? "Unlock" : "Lock"}
        aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
        disabled={layoutLocked}
        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked();
        }}
      >
        {layer.locked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
      </button>
    </li>
  );
}
