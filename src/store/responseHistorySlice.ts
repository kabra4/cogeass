import type { StateCreator } from "zustand";
import type {
  AppState,
  ResponseHistorySlice,
  ResponseHistoryEntry,
} from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";

export const createResponseHistorySlice: StateCreator<
  AppState,
  [],
  [],
  ResponseHistorySlice
> = (set, get) => ({
  responseHistory: {},

  loadResponseHistory: async (operationKey) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    try {
      const entries = await sqlite.getResponseHistory(wsId, operationKey);
      const parsed: ResponseHistoryEntry[] = entries
        .map((entry) => {
          try {
            return {
              id: entry.id,
              response: JSON.parse(entry.response_json),
              timestamp: entry.timestamp,
            };
          } catch {
            return null;
          }
        })
        .filter((e): e is ResponseHistoryEntry => e !== null);

      set((state) => ({
        responseHistory: {
          ...state.responseHistory,
          [operationKey]: parsed,
        },
      }));
    } catch (error) {
      console.error("Failed to load response history:", error);
    }
  },

  addResponseHistoryEntry: async (operationKey, response) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    const responseJson = JSON.stringify(response);
    const timestamp = response.timestamp || Date.now();

    try {
      const id = await sqlite.addResponseHistoryEntry(
        wsId,
        operationKey,
        responseJson
      );

      const current = get().responseHistory[operationKey] || [];
      const newEntry: ResponseHistoryEntry = { id, response, timestamp };
      const updated = [newEntry, ...current].slice(0, 25);

      set((state) => ({
        responseHistory: {
          ...state.responseHistory,
          [operationKey]: updated,
        },
      }));
    } catch (error) {
      console.error("Failed to add response history entry:", error);
    }
  },

  clearResponseHistory: async (operationKey) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    try {
      await sqlite.clearResponseHistory(wsId, operationKey);
      set((state) => ({
        responseHistory: {
          ...state.responseHistory,
          [operationKey]: [],
        },
      }));
    } catch (error) {
      console.error("Failed to clear response history:", error);
    }
  },
});
