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

    // Also persist to workspace
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        const wsOp = ws.data.operationState[key] || {};
        const updatedWs: typeof ws = {
          ...ws,
          data: {
            ...ws.data,
            operationState: {
              ...ws.data.operationState,
              [key]: { ...wsOp, response, lastModified: Date.now() },
            },
          },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updatedWs },
        }));
      }
    }

    // Save to IndexedDB asynchronously
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

      // Also clear from workspace
      const wsId = get().activeWorkspaceId;
      if (wsId) {
        const ws = get().workspaces[wsId];
        if (ws) {
          const wsOp = ws.data.operationState[key];
          if (wsOp) {
            const updatedOp = { ...wsOp };
            delete updatedOp.response;
            const updatedWs: typeof ws = {
              ...ws,
              data: {
                ...ws.data,
                operationState: {
                  ...ws.data.operationState,
                  [key]: updatedOp,
                },
              },
            };
            set((state) => ({
              workspaces: { ...state.workspaces, [wsId]: updatedWs },
            }));
          }
        }
      }

      // Update IndexedDB
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

        // Also update workspace data
        const ws = get().workspaces[wsId];
        if (ws) {
          const updatedWs: typeof ws = {
            ...ws,
            data: {
              ...ws.data,
              operationState: {
                ...ws.data.operationState,
                [key]: opState,
              },
            },
          };
          set((state) => ({
            workspaces: { ...state.workspaces, [wsId]: updatedWs },
          }));
        }
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
