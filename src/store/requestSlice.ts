import type { StateCreator } from "zustand";
import type { AppState, RequestSlice } from "./types";
import * as sqlite from "@/lib/storage/sqliteRepository";
import type { DbWorkspace } from "@/types/backend";

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
        // Update in-memory workspace
        const updated = {
          ...ws,
          data: { ...ws.data, baseUrl: url },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));

        // Persist to database
        const dbWorkspace: DbWorkspace = {
          id: ws.id,
          name: ws.name,
          active_spec_id: ws.specId,
          active_environment_id: ws.data.activeEnvironmentId,
          base_url: url,
          selected_operation_key: ws.data.selectedKey || null,
          sort_order: get().workspaceOrder.indexOf(wsId),
          spec_url: ws.specUrl || null,
        };

        sqlite.updateWorkspace(dbWorkspace).catch((error) => {
          console.error("Failed to update base URL in database:", error);
        });
      }
    }
  },

  setGlobalHeaders: (headers) => {
    set({ globalHeaders: headers });
    const wsId = get().activeWorkspaceId;
    if (wsId) {
      const ws = get().workspaces[wsId];
      if (ws) {
        // Update in-memory workspace
        const updated = {
          ...ws,
          data: { ...ws.data, globalHeaders: headers },
        };
        set((state) => ({
          workspaces: { ...state.workspaces, [wsId]: updated },
        }));

        // Persist to database
        sqlite.setAllGlobalHeaders(wsId, headers).catch((error) => {
          console.error("Failed to update global headers in database:", error);
        });
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

    // Data will be persisted to SQLite via debounced call in useRequestBuilderState
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

    // Save to SQLite asynchronously
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

      // Update SQLite
      get().persistOperationToDB(key);
    }
  },

  loadOperationFromDB: async (key) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    try {
      const data = await sqlite.getOperationState(wsId, key);
      if (data) {
        // Parse form_data JSON
        let formData;
        try {
          formData = JSON.parse(data.form_data);
        } catch (error) {
          console.error("Failed to parse operation form data:", error);
          return;
        }

        // Parse response JSON if present
        let response = undefined;
        if (data.response) {
          try {
            response = JSON.parse(data.response);
          } catch (error) {
            console.error("Failed to parse operation response:", error);
          }
        }

        const opState = {
          pathData: formData.pathData,
          queryData: formData.queryData,
          headerData: formData.headerData,
          customHeaderData: formData.customHeaderData,
          bodyData: formData.bodyData,
          response,
          lastModified: data.last_modified,
        };

        set({
          operationState: {
            ...get().operationState,
            [key]: opState,
          },
        });
      }
    } catch (error) {
      console.error("Failed to load operation from SQLite:", error);
    }
  },

  persistOperationToDB: async (key) => {
    const wsId = get().activeWorkspaceId;
    if (!wsId) return;

    const opState = get().operationState[key];
    if (!opState) return;

    try {
      // Serialize form data
      const formData = JSON.stringify({
        pathData: opState.pathData,
        queryData: opState.queryData,
        headerData: opState.headerData,
        customHeaderData: opState.customHeaderData,
        bodyData: opState.bodyData,
      });

      // Serialize response if present
      const response = opState.response
        ? JSON.stringify(opState.response)
        : null;

      await sqlite.saveOperationState(wsId, key, formData, response);
    } catch (error) {
      console.error("Failed to persist operation to SQLite:", error);
    }
  },
});
