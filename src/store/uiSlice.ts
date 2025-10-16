import type { StateCreator } from "zustand";
import type { AppState, UiSlice } from "./types";

export const createUiSlice: StateCreator<AppState, [], [], UiSlice> = (
  set,
  get
) => ({
  selected: null,
  selectedKey: null,
  setSelected: (op) => {
    set({ selected: op });
    const key = op ? `${op.method}:${op.path}`.toLowerCase() : null;
    set({ selectedKey: key });
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const updated = {
          ...ws,
          data: { ...ws.data, selectedKey: key },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));
      }
    }
  },
});
