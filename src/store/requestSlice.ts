import type { StateCreator } from "zustand";
import type { AppState, RequestSlice } from "./types";
import { operationRepository } from "@/lib/storage/OperationRepository";

export const createRequestSlice: StateCreator<
  AppState,
  [],
  [],
  RequestSlice
> = (set, get) => ({
  baseUrl: "",
  globalHeaders: {},
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
  setGlobalHeaders: (headers) => {
    set({ globalHeaders: headers });
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const updated = {
          ...ws,
          data: { ...ws.data, globalHeaders: headers },
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

    // Data will be persisted to IndexedDB via debounced call in useRequestBuilderState
  },
  setOperationResponse: (key, response) => {
    const currentData = get().operationState[key] || {};
    const updated = {
      ...currentData,
      response,
      lastModified: Date.now(),
    };

    set({
      operationState: {
        ...get().operationState,
        [key]: updated,
      },
    });

    // Save to IndexedDB asynchronously (no localStorage persistence to avoid quota errors)
    get().persistOperationToDB(key);
  },
  clearOperationResponse: (key) => {
    const currentData = get().operationState[key];
    if (currentData?.response) {
      const updated = { ...currentData };
      delete updated.response;
      updated.lastModified = Date.now();

      set({
        operationState: {
          ...get().operationState,
          [key]: updated,
        },
      });

      // Update IndexedDB (no localStorage persistence to avoid quota errors)
      get().persistOperationToDB(key);
    }
  },
  loadOperationFromDB: async (key) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    try {
      const data = await operationRepository.getOperationData(wsId, key);
      if (data) {
        const opState = {
          pathData: data.formData.pathData,
          queryData: data.formData.queryData,
          headerData: data.formData.headerData,
          customHeaderData: data.formData.customHeaderData,
          bodyData: data.formData.bodyData,
          response: data.response,
          lastModified: data.lastModified,
        };

        set({
          operationState: {
            ...get().operationState,
            [key]: opState,
          },
        });

        // No need to sync to workspace - operation data is only stored in IndexedDB
      }
    } catch (error) {
      console.error("Failed to load operation from IndexedDB:", error);
    }
  },
  persistOperationToDB: async (key) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    const opState = get().operationState[key];
    if (!opState) return;

    try {
      await operationRepository.saveOperationData(wsId, key, {
        formData: {
          pathData: opState.pathData,
          queryData: opState.queryData,
          headerData: opState.headerData,
          customHeaderData: opState.customHeaderData,
          bodyData: opState.bodyData,
        },
        response: opState.response,
      });
    } catch (error) {
      console.error("Failed to persist operation to IndexedDB:", error);
    }
  },
});
