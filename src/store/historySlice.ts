import type { StateCreator } from "zustand";
import type { AppState, HistorySlice, HistoryItem } from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";

export const createHistorySlice: StateCreator<
  AppState,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: [],

  addToHistory: (op) => {
    if (!op) return;

    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    const key = `${op.method}:${op.path}`.toLowerCase();
    const timestamp = Date.now();

    const newItem: HistoryItem = {
      operationRef: op,
      timestamp,
      key,
    };

    // 1. Update in-memory state immediately
    const currentHistory = get().history;

    // Remove any existing entry with the same key (deduplication)
    const filteredHistory = currentHistory.filter((item) => item.key !== key);

    // Add new item to the front
    const updatedHistory = [newItem, ...filteredHistory];

    // Keep only the first 5 items in memory (FIFO)
    const limitedHistory = updatedHistory.slice(0, 5);

    // Update runtime state
    set({ history: limitedHistory });

    // Persist to workspace data in store
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

    // 2. Persist to SQLite database
    sqlite
      .addHistoryEntry(wsId, key)
      .then(() => {
        console.log("History entry added to database:", key);

        // Prune old history entries (keep only 50 most recent)
        return sqlite.pruneHistory(wsId, 50);
      })
      .then(() => {
        console.log("History pruned to 50 entries");
      })
      .catch((error) => {
        console.error("Failed to add history entry to database:", error);
      });
  },
});
