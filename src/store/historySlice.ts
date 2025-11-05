import type { StateCreator } from "zustand";
import type { AppState, HistorySlice, HistoryItem } from "./types";

export const createHistorySlice: StateCreator<
  AppState,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: [],

  addToHistory: (op) => {
    if (!op) return;

    const key = `${op.method}:${op.path}`.toLowerCase();
    const timestamp = Date.now();

    const newItem: HistoryItem = {
      operationRef: op,
      timestamp,
      key,
    };

    // Get current history
    const currentHistory = get().history;

    // Remove any existing entry with the same key (deduplication)
    const filteredHistory = currentHistory.filter((item) => item.key !== key);

    // Add new item to the front
    const updatedHistory = [newItem, ...filteredHistory];

    // Keep only the first 5 items (FIFO)
    const limitedHistory = updatedHistory.slice(0, 5);

    // Update runtime state
    set({ history: limitedHistory });

    // Persist to workspace data
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const updated = {
          ...ws,
          data: { ...ws.data, history: limitedHistory },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));
      }
    }
  },
});
