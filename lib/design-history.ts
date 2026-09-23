import type { DesignElement } from "@/lib/design-elements";

const MAX_HISTORY = 80;

export type DesignHistorySnapshot = {
  elements: DesignElement[];
  selectedIds: string[];
};

export type DesignHistoryState = {
  past: DesignHistorySnapshot[];
  present: DesignHistorySnapshot;
  future: DesignHistorySnapshot[];
};

export function createHistory(
  present: DesignHistorySnapshot,
): DesignHistoryState {
  return { past: [], present, future: [] };
}

export function pushHistory(
  state: DesignHistoryState,
  next: DesignHistorySnapshot,
): DesignHistoryState {
  const same =
    JSON.stringify(state.present.elements) === JSON.stringify(next.elements) &&
    JSON.stringify(state.present.selectedIds) ===
      JSON.stringify(next.selectedIds);
  if (same) return state;

  return {
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
  };
}

export function undoHistory(
  state: DesignHistoryState,
): DesignHistoryState | null {
  if (!state.past.length) return null;
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory(
  state: DesignHistoryState,
): DesignHistoryState | null {
  if (!state.future.length) return null;
  const next = state.future[0];
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}

export function cloneElements(elements: DesignElement[]): DesignElement[] {
  return elements.map((el) => ({
    ...el,
    props: { ...el.props },
  }));
}
