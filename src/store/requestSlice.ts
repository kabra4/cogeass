import type { StateCreator } from "zustand";
import type { AppState, RequestSlice } from "./types";

export const createRequestSlice: StateCreator<
  AppState,
  [],
  [],
  RequestSlice
> = (set, get) => ({
  baseUrl: "",
  operationState: {},
  setBaseUrl: (url) => {
    set({ baseUrl: url });
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const updated = {
          ...ws,
          data: { ...ws.data, baseUrl: url },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));
      }
    }
  },
  setOperationState: (key, data) => {
    const currentData = get().operationState[key] || {};
    const nextState = {
      operationState: {
        ...get().operationState,
        [key]: { ...currentData, ...data },
      },
    };
    set(nextState);

    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const wsOp = ws.data.operationState[key] || {};
        const updated: typeof ws = {
          ...ws,
          data: {
            ...ws.data,
            operationState: {
              ...ws.data.operationState,
              [key]: { ...wsOp, ...data },
            },
          },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));
      }
    }
  },
});
